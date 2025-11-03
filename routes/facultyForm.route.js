const express = require('express');
const router = express.Router();
const {
  createFacultyForm,
  getFacultyForms,
  getFacultyFormById,
  updateFacultyForm,
  deleteFacultyForm,
  getFacultyAnalytics,
  approveFacultyForm
} = require('../controllers/facultyForm.controller');

// Middleware for request logging (optional)
const requestLogger = (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
};

// Apply logging middleware to all routes
router.use(requestLogger);

// Validation middleware for creating faculty forms
const validateFacultyForm = (req, res, next) => {
  const {
    instituteName,
    reportingPeriod,
    headName,
    phone,
    email,
    submissionDate,
    academicPrograms,
    specializationAreas
  } = req.body;

  const errors = [];

  // Required field validation
  if (!instituteName || instituteName.trim() === '') {
    errors.push('Institute name is required');
  }

  if (!reportingPeriod || reportingPeriod.trim() === '') {
    errors.push('Reporting period is required');
  }

  if (!headName || headName.trim() === '') {
    errors.push('Head/Coordinator name is required');
  }

  if (!phone || phone.trim() === '') {
    errors.push('Phone number is required');
  }

  if (!email || email.trim() === '') {
    errors.push('Email is required');
  } else {
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Please provide a valid email address');
    }
  }

  if (!submissionDate) {
    errors.push('Submission date is required');
  }

  if (!academicPrograms || !Array.isArray(academicPrograms) || academicPrograms.length === 0) {
    errors.push('At least one academic program is required');
  }

  if (!specializationAreas || !Array.isArray(specializationAreas) || specializationAreas.length === 0) {
    errors.push('At least one specialization area is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

// Routes

// @route   POST /api/faculty-forms
// @desc    Create a new faculty form
// @access  Public
router.post('/faculty-forms', createFacultyForm);

// @route   GET /api/faculty-forms
// @desc    Get all faculty forms with filtering, pagination, and search
// @access  Public
router.get('/faculty-forms', getFacultyForms);

// @route   GET /api/faculty-forms/analytics/overview
// @desc    Get faculty forms analytics and statistics
// @access  Public
router.get('/analytics/overview', getFacultyAnalytics);

// @route   GET /api/faculty-forms/:id
// @desc    Get a single faculty form by ID
// @access  Public
router.get('/:id', getFacultyFormById);

// @route   PUT /api/faculty-forms/:id
// @desc    Update a faculty form by ID
// @access  Public
router.put('/:id', updateFacultyForm);

// @route   DELETE /api/faculty-forms/:id
// @desc    Delete a faculty form by ID
// @access  Public
router.delete('/:id', deleteFacultyForm);

// @route   PATCH /api/faculty-forms/:id/approve
// @desc    Approve a faculty form
// @access  Public (should be protected in production)
router.patch('/:id/approve', approveFacultyForm);

// @route   PATCH /api/faculty-forms/:id/reject
// @desc    Reject a faculty form
// @access  Public (should be protected in production)
router.patch('/:id/reject', async (req, res) => {
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

    const FacultyForm = require('../models/facultyForm.model');
    const facultyForm = await FacultyForm.findById(id);

    if (!facultyForm) {
      return res.status(404).json({
        success: false,
        message: 'Faculty form not found'
      });
    }

    await facultyForm.reject(reviewerId, comments);

    res.status(200).json({
      success: true,
      message: 'Faculty form rejected successfully',
      data: facultyForm
    });

  } catch (error) {
    console.error('Error rejecting faculty form:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

// @route   GET /api/faculty-forms/search/:term
// @desc    Search faculty forms by term
// @access  Public
router.get('/search/:term', async (req, res) => {
  try {
    const { term } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const FacultyForm = require('../models/facultyForm.model')

    // Build search query
    const searchQuery = {
      $or: [
        { instituteName: { $regex: term, $options: 'i' } },
        { headName: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
        { reportingPeriod: { $regex: term, $options: 'i' } },
        { academicPrograms: { $elemMatch: { $regex: term, $options: 'i' } } },
        { specializationAreas: { $elemMatch: { $regex: term, $options: 'i' } } }
      ]
    };

    // Calculate pagination
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Execute search query
    const facultyForms = await FacultyForm.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean();

    // Get total count
    const totalCount = await FacultyForm.countDocuments(searchQuery);
    const totalPages = Math.ceil(totalCount / limitNumber);

    res.status(200).json({
      success: true,
      message: 'Search results retrieved successfully',
      data: facultyForms,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalCount,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,
        limit: limitNumber
      },
      searchTerm: term
    });

  } catch (error) {
    console.error('Error searching faculty forms:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

// @route   GET /api/faculty-forms/export/csv
// @desc    Export faculty forms data as CSV
// @access  Public
router.get('/export/csv', async (req, res) => {
  try {
    const FacultyForm = require('../models/facultyForm.model');
    const facultyForms = await FacultyForm.find({}).lean();

    // Convert to CSV format
    const csvHeaders = [
      'Institute Name',
      'Reporting Period',
      'Head Name',
      'Email',
      'Phone',
      'Submission Date',
      'Total Students',
      'Total Graduates',
      'Research Projects',
      'Collaborations',
      'Status'
    ].join(',');

    const csvRows = facultyForms.map(form => {
      const totalStudents = form.studentEnrollment?.reduce((sum, e) => sum + (e.examAppearedT || 0), 0) || 0;
      const totalGraduates = form.graduates?.reduce((sum, g) => sum + (g.constituentT || 0) + (g.affiliatedT || 0), 0) || 0;
      const totalResearch = (form.researchProjectsInitiated || 0) + (form.researchProjectsCompleted || 0);
      const totalCollaborations = form.collaborations?.length || 0;

      return [
        `"${form.instituteName || ''}"`,
        `"${form.reportingPeriod || ''}"`,
        `"${form.headName || ''}"`,
        `"${form.email || ''}"`,
        `"${form.phone || ''}"`,
        `"${form.submissionDate ? new Date(form.submissionDate).toLocaleDateString() : ''}"`,
        totalStudents,
        totalGraduates,
        totalResearch,
        totalCollaborations,
        `"${form.status || ''}"`
      ].join(',');
    });

    const csvContent = [csvHeaders, ...csvRows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=faculty-forms-export.csv');
    res.status(200).send(csvContent);

  } catch (error) {
    console.error('Error exporting faculty forms:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Route error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler for undefined routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

module.exports = router;