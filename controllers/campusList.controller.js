const mongoose = require('mongoose');
const CampusList = require('../models/CampusList');

function normalizeString(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

async function getNextSN() {
  const latest = await CampusList.findOne().sort({ SN: -1 }).select('SN').lean();
  return (latest?.SN || 0) + 1;
}

exports.listCampusRecords = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '25', 10), 1), 10000);
    const skip = (page - 1) * limit;

    const district = normalizeString(req.query.district);
    const search = normalizeString(req.query.search || req.query.q);

    const filter = {};

    if (district) {
      filter.District = { $regex: district, $options: 'i' };
    }

    if (search) {
      filter.$or = [
        { campusname: { $regex: search, $options: 'i' } },
        { principlename: { $regex: search, $options: 'i' } },
        { District: { $regex: search, $options: 'i' } },
        { fullAddress: { $regex: search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      CampusList.find(filter).sort({ SN: 1, createdAt: 1 }).skip(skip).limit(limit),
      CampusList.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      page,
      limit,
      total,
      data,
      pagination: {
        currentPage: page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        total,
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch campus list', error: error.message });
  }
};

exports.getCampusRecord = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid campus id' });
    }

    const campus = await CampusList.findById(id);
    if (!campus) {
      return res.status(404).json({ success: false, message: 'Campus not found' });
    }

    return res.json({ success: true, data: campus });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch campus', error: error.message });
  }
};

exports.createCampusRecord = async (req, res) => {
  try {
    const payload = req.body || {};

    const campusname = normalizeString(payload.campusname);
    const District = normalizeString(payload.District);

    if (!campusname || !District) {
      return res.status(400).json({ success: false, message: 'campusname and District are required' });
    }

    const SN = Number.isFinite(Number(payload.SN)) && Number(payload.SN) > 0
      ? Number(payload.SN)
      : await getNextSN();

    const duplicateSN = await CampusList.findOne({ SN }).lean();
    if (duplicateSN) {
      return res.status(400).json({ success: false, message: `Campus with SN ${SN} already exists` });
    }

    const campus = await CampusList.create({
      SN,
      campusname,
      localAddress: normalizeString(payload.localAddress),
      District,
      fullAddress: normalizeString(payload.fullAddress),
      principlename: normalizeString(payload.principlename),
      contactNumber: normalizeString(payload.contactNumber),
      emailAddress: normalizeString(payload.emailAddress),
    });

    return res.status(201).json({ success: true, message: 'Campus created successfully', data: campus });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create campus', error: error.message });
  }
};

exports.updateCampusRecord = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid campus id' });
    }

    const campus = await CampusList.findById(id);
    if (!campus) {
      return res.status(404).json({ success: false, message: 'Campus not found' });
    }

    const payload = req.body || {};

    if (payload.SN !== undefined) {
      const nextSN = Number(payload.SN);
      if (!Number.isFinite(nextSN) || nextSN <= 0) {
        return res.status(400).json({ success: false, message: 'SN must be a positive number' });
      }

      const duplicateSN = await CampusList.findOne({ SN: nextSN, _id: { $ne: id } }).lean();
      if (duplicateSN) {
        return res.status(400).json({ success: false, message: `Campus with SN ${nextSN} already exists` });
      }

      campus.SN = nextSN;
    }

    if (payload.campusname !== undefined) campus.campusname = normalizeString(payload.campusname);
    if (payload.localAddress !== undefined) campus.localAddress = normalizeString(payload.localAddress);
    if (payload.District !== undefined) campus.District = normalizeString(payload.District);
    if (payload.fullAddress !== undefined) campus.fullAddress = normalizeString(payload.fullAddress);
    if (payload.principlename !== undefined) campus.principlename = normalizeString(payload.principlename);
    if (payload.contactNumber !== undefined) campus.contactNumber = normalizeString(payload.contactNumber);
    if (payload.emailAddress !== undefined) campus.emailAddress = normalizeString(payload.emailAddress);

    if (!campus.campusname || !campus.District) {
      return res.status(400).json({ success: false, message: 'campusname and District are required' });
    }

    await campus.save();

    return res.json({ success: true, message: 'Campus updated successfully', data: campus });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update campus', error: error.message });
  }
};

exports.deleteCampusRecord = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid campus id' });
    }

    const campus = await CampusList.findByIdAndDelete(id);
    if (!campus) {
      return res.status(404).json({ success: false, message: 'Campus not found' });
    }

    return res.json({ success: true, message: 'Campus deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete campus', error: error.message });
  }
};
