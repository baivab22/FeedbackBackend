const Donor = require('../models/doner.model');

// @desc    Create a new donor
// @route   POST /api/donors
// @access  Public/Private (adjust as needed)
const createDonor = async (req, res) => {
  try {
    console.log('Creating donor with data:', req.body);
    const donor = new Donor(req.body);

    const savedDonor = await donor.save();
    
    res.status(201).json({
      success: true,
      data: savedDonor,
      message: 'Donor created successfully'
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
      message: 'Error creating donor',
      error: error.message
    });
  }
};

// @desc    Get all donors
// @route   GET /api/donors
// @access  Public/Private (adjust as needed)
const getAllDonors = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      natureOfEndowment,
      relatedDepart
    } = req.query;

    // Build query object
    let query = {};
    
    // Search functionality - updated for new fields
    if (search) {
      query.$or = [
        { donorName: { $regex: search, $options: 'i' } },
        { fundOfficialName: { $regex: search, $options: 'i' } },
        { relatedDepart: { $regex: search, $options: 'i' } },
        { personInCareOf: { $regex: search, $options: 'i' } },
        { donorEmail: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by nature of endowment
    if (natureOfEndowment) {
      query.natureOfEndowment = natureOfEndowment;
    }

    // Filter by department
    if (relatedDepart) {
      query.relatedDepart = { $regex: relatedDepart, $options: 'i' };
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const donors = await Donor.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Donor.countDocuments(query);

    res.status(200).json({
      success: true,
      data: donors,
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
      message: 'Error fetching donors',
      error: error.message
    });
  }
};

// @desc    Get single donor by ID
// @route   GET /api/donors/:id
// @access  Public/Private (adjust as needed)
const getDonorById = async (req, res) => {
  try {
    const donor = await Donor.findById(req.params.id);
    
    if (!donor) {
      return res.status(404).json({
        success: false,
        message: 'Donor not found'
      });
    }

    res.status(200).json({
      success: true,
      data: donor
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid donor ID'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error fetching donor',
      error: error.message
    });
  }
};

// @desc    Update donor
// @route   PUT /api/donors/:id
// @access  Public/Private (adjust as needed)
const updateDonor = async (req, res) => {
  try {
    const donor = await Donor.findByIdAndUpdate(
      req.params.id,
      req.body,
      { 
        new: true, // Return updated document
        runValidators: true // Run model validations on update
      }
    );

    if (!donor) {
      return res.status(404).json({
        success: false,
        message: 'Donor not found'
      });
    }

    res.status(200).json({
      success: true,
      data: donor,
      message: 'Donor updated successfully'
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
        message: 'Invalid donor ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating donor',
      error: error.message
    });
  }
};

// @desc    Delete donor
// @route   DELETE /api/donors/:id
// @access  Public/Private (adjust as needed)
const deleteDonor = async (req, res) => {
  try {
    const donor = await Donor.findByIdAndDelete(req.params.id);

    if (!donor) {
      return res.status(404).json({
        success: false,
        message: 'Donor not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Donor deleted successfully'
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid donor ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error deleting donor',
      error: error.message
    });
  }
};

// @desc    Get donors by nature of endowment
// @route   GET /api/donors/nature/:nature
// @access  Public/Private (adjust as needed)
const getDonorsByNature = async (req, res) => {
  try {
    const { nature } = req.params;
    
    const donors = await Donor.find({ natureOfEndowment: { $regex: nature, $options: 'i' } });
    
    res.status(200).json({
      success: true,
      data: donors,
      count: donors.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching donors by nature of endowment',
      error: error.message
    });
  }
};

// @desc    Get donors by department
// @route   GET /api/donors/department/:department
// @access  Public/Private (adjust as needed)
const getDonorsByDepartment = async (req, res) => {
  try {
    const { department } = req.params;
    
    const donors = await Donor.find({ 
      relatedDepart: { $regex: department, $options: 'i' } 
    });
    
    res.status(200).json({
      success: true,
      data: donors,
      count: donors.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching donors by department',
      error: error.message
    });
  }
};

// @desc    Get donors by funding plan
// @route   GET /api/donors/funding-plan/:plan
// @access  Public/Private (adjust as needed)
const getDonorsByFundingPlan = async (req, res) => {
  try {
    const { plan } = req.params;
    
    const donors = await Donor.find({ 
      fundingPlan: { $regex: plan, $options: 'i' } 
    });
    
    res.status(200).json({
      success: true,
      data: donors,
      count: donors.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching donors by funding plan',
      error: error.message
    });
  }
};

// @desc    Get statistics
// @route   GET /api/donors/stats/summary
// @access  Public/Private (adjust as needed)
const getDonorStats = async (req, res) => {
  try {
    const totalDonors = await Donor.countDocuments();
    
    const natureStats = await Donor.aggregate([
      {
        $group: {
          _id: '$natureOfEndowment',
          count: { $sum: 1 },
          totalPrincipalAmount: { $sum: '$principalAmountOfEndowment' },
          totalEndowmentAmount: { $sum: '$amountOfEndowment' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const departmentStats = await Donor.aggregate([
      {
        $group: {
          _id: '$relatedDepart',
          count: { $sum: 1 },
          totalPrincipalAmount: { $sum: '$principalAmountOfEndowment' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const totalPrincipalAmount = await Donor.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$principalAmountOfEndowment' }
        }
      }
    ]);

    const totalEndowmentAmount = await Donor.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$amountOfEndowment' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalDonors,
        totalPrincipalAmount: totalPrincipalAmount[0]?.total || 0,
        totalEndowmentAmount: totalEndowmentAmount[0]?.total || 0,
        natureStats,
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

// @desc    Get financial summary
// @route   GET /api/donors/stats/financial
// @access  Public/Private (adjust as needed)
const getFinancialStats = async (req, res) => {
  try {
    const financialStats = await Donor.aggregate([
      {
        $group: {
          _id: null,
          totalPrincipalAmount: { $sum: '$principalAmountOfEndowment' },
          totalEndowmentAmount: { $sum: '$amountOfEndowment' },
          avgPrincipalAmount: { $avg: '$principalAmountOfEndowment' },
          avgEndowmentAmount: { $avg: '$amountOfEndowment' },
          maxPrincipalAmount: { $max: '$principalAmountOfEndowment' },
          minPrincipalAmount: { $min: '$principalAmountOfEndowment' },
          count: { $sum: 1 }
        }
      }
    ]);

    const yearlyStats = await Donor.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$agreementDate' }
          },
          count: { $sum: 1 },
          totalPrincipalAmount: { $sum: '$principalAmountOfEndowment' },
          totalEndowmentAmount: { $sum: '$amountOfEndowment' }
        }
      },
      { $sort: { '_id.year': -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: financialStats[0] || {},
        yearlyBreakdown: yearlyStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching financial statistics',
      error: error.message
    });
  }
};

module.exports = {
  createDonor,
  getAllDonors,
  getDonorById,
  updateDonor,
  deleteDonor,
  getDonorsByNature,
  getDonorsByDepartment,
  getDonorsByFundingPlan,
  getDonorStats,
  getFinancialStats
};