const FacultyForm = require('../models/facultyForm.model');

// @desc    Create a new faculty form
// @route   POST /api/faculty-forms
// @access  Public
const createFacultyForm = async (req, res) => {
  try {
    const formData = req.body;

    console.log('Received faculty form data:', formData);

    // Create new faculty form
    const facultyForm = new FacultyForm(formData);
    await facultyForm.save();

    res.status(201).json({
      success: true,
      message: 'Faculty form created successfully',
      data: facultyForm
    });
  } catch (error) {
    console.error('Error creating faculty form:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Faculty form with similar data already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Get all faculty forms with filtering, pagination, and search
// @route   GET /api/faculty-forms
// @access  Public
const getFacultyForms = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      reportingPeriod,
      instituteName,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query object
    const query = {};

    // Search functionality
    if (search) {
      query.$or = [
        { instituteName: { $regex: search, $options: 'i' } },
        { headName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { reportingPeriod: { $regex: search, $options: 'i' } },
        { 'academicPrograms.programName': { $regex: search, $options: 'i' } },
        { 'academicPrograms.specializationAreas': { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by reporting period
    if (reportingPeriod) {
      query.reportingPeriod = reportingPeriod;
    }

    // Filter by institute name
    if (instituteName) {
      query.instituteName = { $regex: instituteName, $options: 'i' };
    }

    // Calculate pagination
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const facultyForms = await FacultyForm.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNumber)
      .lean();

    // Get total count for pagination
    const totalCount = await FacultyForm.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limitNumber);

    res.status(200).json({
      success: true,
      message: 'Faculty forms retrieved successfully',
      data: facultyForms,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalCount,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,
        limit: limitNumber
      }
    });
  } catch (error) {
    console.error('Error retrieving faculty forms:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Get a single faculty form by ID
// @route   GET /api/faculty-forms/:id
// @access  Public
const getFacultyFormById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid faculty form ID'
      });
    }

    const facultyForm = await FacultyForm.findById(id);

    if (!facultyForm) {
      return res.status(404).json({
        success: false,
        message: 'Faculty form not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Faculty form retrieved successfully',
      data: facultyForm
    });
  } catch (error) {
    console.error('Error retrieving faculty form:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Update a faculty form by ID
// @route   PUT /api/faculty-forms/:id
// @access  Public
const updateFacultyForm = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate ObjectId
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid faculty form ID'
      });
    }

    // Find and update the faculty form
    const facultyForm = await FacultyForm.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true, // Return updated document
        runValidators: true // Run model validators
      }
    );

    if (!facultyForm) {
      return res.status(404).json({
        success: false,
        message: 'Faculty form not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Faculty form updated successfully',
      data: facultyForm
    });
  } catch (error) {
    console.error('Error updating faculty form:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Delete a faculty form by ID
// @route   DELETE /api/faculty-forms/:id
// @access  Public
const deleteFacultyForm = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid faculty form ID'
      });
    }

    const facultyForm = await FacultyForm.findByIdAndDelete(id);

    if (!facultyForm) {
      return res.status(404).json({
        success: false,
        message: 'Faculty form not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Faculty form deleted successfully',
      data: facultyForm
    });
  } catch (error) {
    console.error('Error deleting faculty form:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Get faculty forms analytics and statistics
// @route   GET /api/faculty-forms/analytics/overview
// @access  Public
const getFacultyAnalytics = async (req, res) => {
  try {
    // Get total counts
    const totalForms = await FacultyForm.countDocuments();
    const submittedForms = await FacultyForm.countDocuments({ status: 'submitted' });
    const approvedForms = await FacultyForm.countDocuments({ status: 'approved' });
    const reviewedForms = await FacultyForm.countDocuments({ status: 'reviewed' });

    // Get analytics data using aggregation
    const analyticsData = await FacultyForm.aggregate([
      {
        $group: {
          _id: null,
          totalStudents: { $sum: '$totalStudents' },
          totalGraduates: { $sum: '$totalGraduates' },
          totalResearchProjects: { $sum: '$totalResearchProjects' },
          averagePassRate: { $avg: '$passRate' },
          totalCollaborations: { $sum: { $size: '$collaborations' } },
          totalPrograms: { $sum: { $size: '$academicPrograms' } }
        }
      }
    ]);

    // Get forms by reporting period
    const formsByPeriod = await FacultyForm.aggregate([
      {
        $group: {
          _id: '$reportingPeriod',
          count: { $sum: 1 },
          totalStudents: { $sum: '$totalStudents' },
          totalGraduates: { $sum: '$totalGraduates' }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    // Get forms by status
    const formsByStatus = await FacultyForm.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get top institutes by student count
    const topInstitutes = await FacultyForm.aggregate([
      {
        $group: {
          _id: '$instituteName',
          totalStudents: { $sum: '$totalStudents' },
          totalGraduates: { $sum: '$totalGraduates' },
          formCount: { $sum: 1 }
        }
      },
      { $sort: { totalStudents: -1 } },
      { $limit: 10 }
    ]);

    const analytics = {
      overview: {
        totalForms,
        submittedForms,
        approvedForms,
        reviewedForms,
        ...(analyticsData[0] || {
          totalStudents: 0,
          totalGraduates: 0,
          totalResearchProjects: 0,
          averagePassRate: 0,
          totalCollaborations: 0,
          totalPrograms: 0
        })
      },
      formsByPeriod,
      formsByStatus,
      topInstitutes
    };

    res.status(200).json({
      success: true,
      message: 'Analytics retrieved successfully',
      data: analytics
    });
  } catch (error) {
    console.error('Error retrieving analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Approve a faculty form
// @route   PATCH /api/faculty-forms/:id/approve
// @access  Public (should be protected in production)
const approveFacultyForm = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewerId, comments } = req.body;

    // Validate ObjectId
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid faculty form ID'
      });
    }

    const facultyForm = await FacultyForm.findById(id);

    if (!facultyForm) {
      return res.status(404).json({
        success: false,
        message: 'Faculty form not found'
      });
    }

    await facultyForm.approve(reviewerId, comments);

    res.status(200).json({
      success: true,
      message: 'Faculty form approved successfully',
      data: facultyForm
    });
  } catch (error) {
    console.error('Error approving faculty form:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

module.exports = {
  createFacultyForm,
  getFacultyForms,
  getFacultyFormById,
  updateFacultyForm,
  deleteFacultyForm,
  getFacultyAnalytics,
  approveFacultyForm
};