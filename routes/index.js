const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { User, ROLES } = require('../models/User');
const { Suggestion, CATEGORIES, STATUSES } = require('../models/Suggestion');
const { verifyJWT, optionalAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// const router = express();

/**
 * Multer setup for media uploads (images/videos)
 */
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const safe = file.originalname.replace(/\s+/g, '_');
    cb(null, `${unique}-${safe}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) return cb(null, true);
    return cb(new Error('Only images and videos are allowed'));
  }
});

/**
 * Helpers
 */
function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

function pick(obj, fields) {
  return fields.reduce((acc, k) => {
    if (Object.prototype.hasOwnProperty.call(obj, k)) acc[k] = obj[k];
    return acc;
  }, {});
}

/**
 * Auth Routes
 */
// Register (public). Role forced to non-admin unless controlled by admins in future.
router.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email, password are required' });
    }
    
    // FIXED: Removed the "&& role !== 'admin'" restriction
    const normalizedRole = ROLES.includes(role) ? role : 'student';

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: email.toLowerCase(), password: hash, role: normalizedRole });
    const token = signToken(user);
    return res.status(201).json({ user: user.toSafeJSON(), token });
  } catch (err) {
    return res.status(500).json({ message: 'Registration failed', error: err.message });
  }
});


// Login
// Temporary debug version of your login route
router.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    console.log('Login attempt for email:', email); // Debug log
    
    if (!email || !password) return res.status(400).json({ message: 'email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    console.log('User found:', user ? 'YES' : 'NO'); // Debug log
    
    if (!user) {
      console.log('User not found in database'); // Debug log
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('User role:', user.role); // Debug log
    console.log('Stored password hash:', user.password.substring(0, 10) + '...'); // Debug log (first 10 chars)

    const ok = await bcrypt.compare(password, user.password);
    console.log('Password comparison result:', ok); // Debug log
    
    if (!ok) {
      console.log('Password comparison failed'); // Debug log
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken(user);
    console.log('Login successful for:', user.email); // Debug log
    return res.json({ user: user.toSafeJSON(), token });
  } catch (err) {
    console.error('Login error:', err); // Debug log
    return res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

// Logout (stateless)
router.post('/api/auth/logout', verifyJWT, async (_req, res) => {
  return res.json({ message: 'Logged out (client should discard token)' });
});

/**
 * Suggestion Routes
 */

// Create suggestion (anonymous or authenticated) with optional media files
// Accepts multipart/form-data with fields: category, description, anonymous
// and files under field name "media"
router.post('/api/suggestions', upload.array('media', 5), async (req, res) => {
  try {
    const { category, description,assignedDepartment } = req.body || {};
    const anonymous = String(req.body?.anonymous || 'true') === 'true';

    if (!category || !description) {
      return res.status(400).json({ message: 'category and description are required' });
    }
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ message: `Invalid category. Allowed: ${CATEGORIES.join(', ')}` });
    }
    if (!anonymous && !req.user) {
      return res.status(401).json({ message: 'Authentication required for non-anonymous submission' });
    }

    const files = (req.files || []).map((f) => ({
      type: f.mimetype.startsWith('image/') ? 'image' : 'video',
      url: `${req.protocol}://${req.get('host')}/uploads/${f.filename}`,
      filename: f.filename,
      mimetype: f.mimetype,
      size: f.size
    }));

    console.log(assignedDepartment,"assigned detpartment");

    const doc = await Suggestion.create({
      user: anonymous ? undefined : req.user?.id,
      anonymous,
      category,
      description,
      media: files,
      assignedDepartment
    });
    return res.status(201).json({ suggestion: doc.toPublicJSON() });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to create suggestion', error: err.message });
  }
});

// List current user's suggestions
router.get('/api/suggestions/my', verifyJWT, async (req, res) => {
  try {
    const docs = await Suggestion.find({ user: req.user.id }).sort({ createdAt: -1 });
    return res.json({ suggestions: docs.map((d) => d.toPublicJSON()) });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to list suggestions', error: err.message });
  }
});

// Track suggestion status by ID (public)
router.get('/api/suggestions/track/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid suggestion id' });
    const doc = await Suggestion.findById(id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    const minimal = {
      id: doc._id,
      status: doc.status,
      category: doc.category,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
    return res.json({ suggestion: minimal });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to track suggestion', error: err.message });
  }
});

// Public transparency: list resolved suggestions (paginated)
router.get('/api/public/resolved', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 100);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Suggestion.find({ status: 'Resolved' }).sort({ updatedAt: -1 }).skip(skip).limit(limit),
      Suggestion.countDocuments({ status: 'Resolved' })
    ]);

    return res.json({
      page,
      limit,
      total,
      suggestions: items.map((d) => d.toPublicJSON())
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch resolved suggestions', error: err.message });
  }
});

/**
 * Admin Routes
 */
router.get('/api/admin/suggestions', verifyJWT, requireRole('admin'), async (req, res) => {
  try {
    const {
      category,
      status,
      assignedDepartment,
      q,
      from,
      to,
      page: pageStr,
      limit: limitStr
    } = req.query;

    const page = Math.max(parseInt(pageStr || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(limitStr || '20', 10), 1), 200);
    const skip = (page - 1) * limit;

    const filter = {};
    if (category && CATEGORIES.includes(category)) filter.category = category;
    if (status && STATUSES.includes(status)) filter.status = status;
    if (assignedDepartment) filter.assignedDepartment = assignedDepartment;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    if (q) {
      filter.description = { $regex: q, $options: 'i' };
    }

    const [items, total] = await Promise.all([
      Suggestion.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Suggestion.countDocuments(filter)
    ]);

    return res.json({
      page,
      limit,
      total,
      suggestions: items.map((d) => d.toPublicJSON())
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch admin suggestions', error: err.message });
  }
});

// Update suggestion fields: status, category, assignedDepartment, assignedTo
router.patch('/api/admin/suggestions/:id', verifyJWT, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid suggestion id' });

    const updates = pick(req.body || {}, ['status', 'category', 'assignedDepartment', 'assignedTo']);
    if (updates.status && !STATUSES.includes(updates.status)) {
      return res.status(400).json({ message: `Invalid status. Allowed: ${STATUSES.join(', ')}` });
    }
    if (updates.category && !CATEGORIES.includes(updates.category)) {
      return res.status(400).json({ message: `Invalid category. Allowed: ${CATEGORIES.join(', ')}` });
    }

    const doc = await Suggestion.findByIdAndUpdate(id, updates, { new: true });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    return res.json({ suggestion: doc.toPublicJSON() });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update suggestion', error: err.message });
  }
});

router.delete('/api/admin/suggestions/:id', verifyJWT, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid suggestion id' });
    const result = await Suggestion.findByIdAndDelete(id);
    if (!result) return res.status(404).json({ message: 'Not found' });
    return res.json({ message: 'Deleted' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete suggestion', error: err.message });
  }
});

// Analytics & Reports
router.get('/api/admin/reports/summary', verifyJWT, requireRole('admin'), async (_req, res) => {
  try {
    // Counts by status
    const byStatus = await Suggestion.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Counts by category
    const byCategory = await Suggestion.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    // Monthly counts (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const monthly = await Suggestion.aggregate([
      { $match: { createdAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    return res.json({
      byStatus,
      byCategory,
      monthly
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to build report', error: err.message });
  }
});

module.exports = router;