const Donater = require('../models/doner.model'); // Adjust path as needed

// @desc    Create a new donater
// @route   POST /api/donaters
// @access  Public/Private (adjust as needed)
const createDonater = async (req, res) => {
  try {
        console.log('Creating donater with data:', req.body);
    const donater = new Donater(req.body);


    const savedDonater = await donater.save();
    
    res.status(201).json({
      success: true,
      data: savedDonater,
      message: 'Donater created successfully'
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating donater',
      error: error.message
    });
  }
};

// @desc    Get all donaters
// @route   GET /api/donaters
// @access  Public/Private (adjust as needed)
const getAllDonaters = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      prizeType,
      relatedDepart
    } = req.query;

    // Build query object
    let query = {};
    
    // Search functionality
    if (search) {
      query.$or = [
        { donaterName: { $regex: search, $options: 'i' } },
        { prizeName: { $regex: search, $options: 'i' } },
        { relatedDepart: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by prize type
    if (prizeType) {
      query.prizeType = prizeType;
    }

    // Filter by department
    if (relatedDepart) {
      query.relatedDepart = { $regex: relatedDepart, $options: 'i' };
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const donaters = await Donater.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Donater.countDocuments(query);

    res.status(200).json({
      success: true,
      data: donaters,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching donaters',
      error: error.message
    });
  }
};

// @desc    Get single donater by ID
// @route   GET /api/donaters/:id
// @access  Public/Private (adjust as needed)
const getDonaterById = async (req, res) => {
  try {
    const donater = await Donater.findById(req.params.id);
    
    if (!donater) {
      return res.status(404).json({
        success: false,
        message: 'Donater not found'
      });
    }

    res.status(200).json({
      success: true,
      data: donater
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid donater ID'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error fetching donater',
      error: error.message
    });
  }
};

// @desc    Update donater
// @route   PUT /api/donaters/:id
// @access  Public/Private (adjust as needed)
const updateDonater = async (req, res) => {
  try {
    const donater = await Donater.findByIdAndUpdate(
      req.params.id,
      req.body,
      { 
        new: true, // Return updated document
        runValidators: true // Run model validations on update
      }
    );

    if (!donater) {
      return res.status(404).json({
        success: false,
        message: 'Donater not found'
      });
    }

    res.status(200).json({
      success: true,
      data: donater,
      message: 'Donater updated successfully'
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors
      });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid donater ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating donater',
      error: error.message
    });
  }
};

// @desc    Delete donater
// @route   DELETE /api/donaters/:id
// @access  Public/Private (adjust as needed)
const deleteDonater = async (req, res) => {
  try {
    const donater = await Donater.findByIdAndDelete(req.params.id);

    if (!donater) {
      return res.status(404).json({
        success: false,
        message: 'Donater not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Donater deleted successfully'
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid donater ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error deleting donater',
      error: error.message
    });
  }
};

// @desc    Get donaters by prize type
// @route   GET /api/donaters/prize-type/:prizeType
// @access  Public/Private (adjust as needed)
const getDonatersByPrizeType = async (req, res) => {
  try {
    const { prizeType } = req.params;
    
    const donaters = await Donater.find({ prizeType });
    
    res.status(200).json({
      success: true,
      data: donaters,
      count: donaters.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching donaters by prize type',
      error: error.message
    });
  }
};

// @desc    Get donaters by department
// @route   GET /api/donaters/department/:department
// @access  Public/Private (adjust as needed)
const getDonatersByDepartment = async (req, res) => {
  try {
    const { department } = req.params;
    
    const donaters = await Donater.find({ 
      relatedDepart: { $regex: department, $options: 'i' } 
    });
    
    res.status(200).json({
      success: true,
      data: donaters,
      count: donaters.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching donaters by department',
      error: error.message
    });
  }
};

// @desc    Get statistics
// @route   GET /api/donaters/stats/summary
// @access  Public/Private (adjust as needed)
const getDonaterStats = async (req, res) => {
  try {
    const totalDonaters = await Donater.countDocuments();
    
    const prizeTypeStats = await Donater.aggregate([
      {
        $group: {
          _id: '$prizeType',
          count: { $sum: 1 }
        }
      }
    ]);

    const departmentStats = await Donater.aggregate([
      {
        $group: {
          _id: '$relatedDepart',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalDonaters,
        prizeTypeStats,
        topDepartments: departmentStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
};

module.exports = {
  createDonater,
  getAllDonaters,
  getDonaterById,
  updateDonater,
  deleteDonater,
  getDonatersByPrizeType,
  getDonatersByDepartment,
  getDonaterStats
};