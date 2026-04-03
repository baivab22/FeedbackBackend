const mongoose = require('mongoose');
const Event = require('../models/Event');

function normalizeStatus(status) {
  if (!status) return undefined;
  return status === 'draft' ? 'draft' : 'published';
}

function parseBoolean(input, defaultValue = false) {
  if (input === undefined || input === null || input === '') return defaultValue;
  if (typeof input === 'boolean') return input;
  return String(input).toLowerCase() === 'true';
}

function parseJsonArray(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  try {
    const parsed = JSON.parse(input);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseImageArray(input) {
  return parseJsonArray(input).filter((item) => typeof item === 'string' && item.trim() !== '');
}

function buildImageUrls(req, files) {
  return (files || []).map((file) => `${req.protocol}://${req.get('host')}/uploads/${file.filename}`);
}

exports.listPublicEvents = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '12', 10), 1), 50);
    const skip = (page - 1) * limit;
    const q = (req.query.q || '').trim();

    const filter = { status: 'published' };
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { shortDescription: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
        { location: { $regex: q, $options: 'i' } },
      ];
    }

    const [events, total] = await Promise.all([
      Event.find(filter).sort({ isFeatured: -1, eventDate: -1, createdAt: -1 }).skip(skip).limit(limit),
      Event.countDocuments(filter),
    ]);

    res.json({
      success: true,
      page,
      limit,
      total,
      events,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch events', error: error.message });
  }
};

exports.listAdminEvents = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
    const skip = (page - 1) * limit;
    const q = (req.query.q || '').trim();
    const status = normalizeStatus(req.query.status);

    const filter = {};
    if (status) filter.status = status;
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { shortDescription: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }

    const [events, total] = await Promise.all([
      Event.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Event.countDocuments(filter),
    ]);

    res.json({ success: true, page, limit, total, events });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch admin events', error: error.message });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid event id' });
    }

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    return res.json({ success: true, event });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch event', error: error.message });
  }
};

exports.createEvent = async (req, res) => {
  try {
    const {
      title,
      shortDescription,
      description,
      eventDate,
      location,
      category,
      status,
      isFeatured,
    } = req.body || {};

    if (!title || !description || !eventDate) {
      // Cleanup files if validation fails
      if (req.files && req.files.length > 0) {
        const fs = require('fs');
        const path = require('path');
        const uploadDir = path.join(process.cwd(), 'uploads');
        req.files.forEach((file) => {
          const filePath = path.join(uploadDir, file.filename);
          fs.unlink(filePath, (err) => {
            if (err) console.error(`Failed to cleanup file ${file.filename}:`, err);
          });
        });
      }
      return res.status(400).json({ success: false, message: 'title, description and eventDate are required' });
    }

    const cloudinaryImages = parseImageArray(req.body?.images);
    const uploadedImages = buildImageUrls(req, req.files);
    const images = [...cloudinaryImages, ...uploadedImages];

    const event = await Event.create({
      title: String(title).trim(),
      shortDescription: shortDescription ? String(shortDescription).trim() : '',
      description: String(description).trim(),
      eventDate,
      location: location ? String(location).trim() : '',
      category: category ? String(category).trim() : 'General',
      images,
      status: normalizeStatus(status) || 'published',
      isFeatured: parseBoolean(isFeatured, false),
    });

    return res.status(201).json({ success: true, message: 'Event created successfully', event });
  } catch (error) {
    // Cleanup files on error
    if (req.files && req.files.length > 0) {
      const fs = require('fs');
      const path = require('path');
      const uploadDir = path.join(process.cwd(), 'uploads');
      req.files.forEach((file) => {
        const filePath = path.join(uploadDir, file.filename);
        fs.unlink(filePath, (err) => {
          if (err) console.error(`Failed to cleanup file ${file.filename}:`, err);
        });
      });
    }
    return res.status(500).json({ success: false, message: 'Failed to create event', error: error.message });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      // Cleanup files if ID validation fails
      if (req.files && req.files.length > 0) {
        const fs = require('fs');
        const path = require('path');
        const uploadDir = path.join(process.cwd(), 'uploads');
        req.files.forEach((file) => {
          const filePath = path.join(uploadDir, file.filename);
          fs.unlink(filePath, (err) => {
            if (err) console.error(`Failed to cleanup file ${file.filename}:`, err);
          });
        });
      }
      return res.status(400).json({ success: false, message: 'Invalid event id' });
    }

    const event = await Event.findById(id);
    if (!event) {
      // Cleanup files if event not found
      if (req.files && req.files.length > 0) {
        const fs = require('fs');
        const path = require('path');
        const uploadDir = path.join(process.cwd(), 'uploads');
        req.files.forEach((file) => {
          const filePath = path.join(uploadDir, file.filename);
          fs.unlink(filePath, (err) => {
            if (err) console.error(`Failed to cleanup file ${file.filename}:`, err);
          });
        });
      }
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const removedImages = parseJsonArray(req.body.removedImages);
    const hasImagesField = Object.prototype.hasOwnProperty.call(req.body || {}, 'images');
    const cloudinaryImages = parseImageArray(req.body?.images);
    const newImageUrls = buildImageUrls(req, req.files);
    const retainedImages = event.images.filter((img) => !removedImages.includes(img));

    if (req.body.title !== undefined) event.title = String(req.body.title).trim();
    if (req.body.shortDescription !== undefined) event.shortDescription = String(req.body.shortDescription).trim();
    if (req.body.description !== undefined) event.description = String(req.body.description).trim();
    if (req.body.eventDate !== undefined) event.eventDate = req.body.eventDate;
    if (req.body.location !== undefined) event.location = String(req.body.location).trim();
    if (req.body.category !== undefined) event.category = String(req.body.category).trim();
    if (req.body.status !== undefined) event.status = normalizeStatus(req.body.status) || event.status;
    if (req.body.isFeatured !== undefined) event.isFeatured = parseBoolean(req.body.isFeatured, event.isFeatured);

    if (hasImagesField) {
      event.images = [...cloudinaryImages, ...newImageUrls];
    } else {
      event.images = [...retainedImages, ...newImageUrls];
    }

    await event.save();

    return res.json({ success: true, message: 'Event updated successfully', event });
  } catch (error) {
    // Cleanup files on error
    if (req.files && req.files.length > 0) {
      const fs = require('fs');
      const path = require('path');
      const uploadDir = path.join(process.cwd(), 'uploads');
      req.files.forEach((file) => {
        const filePath = path.join(uploadDir, file.filename);
        fs.unlink(filePath, (err) => {
          if (err) console.error(`Failed to cleanup file ${file.filename}:`, err);
        });
      });
    }
    return res.status(500).json({ success: false, message: 'Failed to update event', error: error.message });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid event id' });
    }

    const event = await Event.findByIdAndDelete(id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    return res.json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete event', error: error.message });
  }
};
