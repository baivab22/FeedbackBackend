const asyncHandler = require('express-async-handler');
const SurveyReport = require('../models/surveyReport.model');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');

// @desc    Create a new survey report
// @route   POST /api/survey-reports
// @access  Private
const createSurveyReport = asyncHandler(async (req, res) => {
  try {
    const { collegeName, reportYear, description } = req.body;
    const { id: userId } = req.user;

    // Validation
    if (!collegeName || !reportYear) {
      return res.status(400).json({
        success: false,
        message: 'College name and report year are required'
      });
    }

    // Check if report already exists
    const existingReport = await SurveyReport.findOne({ 
      collegeName, 
      reportYear 
    });

    if (existingReport) {
      return res.status(400).json({
        success: false,
        message: 'A report for this college and year already exists'
      });
    }

    const pdfData = req.file ? {
      filename: req.file.filename,
      path: req.file.path,
      originalName: req.file.originalname,
      size: req.file.size,
      uploadDate: new Date()
    } : null;

    const surveyReport = new SurveyReport({
      collegeName,
      reportYear,
      description,
      uploadedBy: userId,
      pdfFile: pdfData,
      status: 'pending'
    });

    const savedReport = await surveyReport.save();
    await savedReport.populate('uploadedBy', 'name email');

    res.status(201).json({
      success: true,
      data: savedReport,
      message: 'Survey report created successfully'
    });
  } catch (error) {
    console.error('Create survey report error:', error);
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error creating survey report',
      error: error.message
    });
  }
});

// @desc    Get all survey reports with filtering
// @route   GET /api/survey-reports
// @access  Public
const getSurveyReports = asyncHandler(async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      collegeName,
      reportYear,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (page - 1) * limit;
    const query = { isActive: true };

    if (collegeName) {
      query.collegeName = new RegExp(collegeName, 'i');
    }
    if (reportYear) {
      query.reportYear = reportYear;
    }
    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { collegeName: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
    }

    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const reports = await SurveyReport.find(query)
      .populate('uploadedBy', 'name email')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SurveyReport.countDocuments(query);

    res.status(200).json({
      success: true,
      data: reports,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
        pageSize: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get survey reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching survey reports',
      error: error.message
    });
  }
});

// @desc    Get a single survey report by ID
// @route   GET /api/survey-reports/:id
// @access  Public
const getSurveyReportById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const report = await SurveyReport.findByIdAndUpdate(
      id,
      { $inc: { viewCount: 1 } },
      { new: true }
    ).populate('uploadedBy', 'name email');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Survey report not found'
      });
    }

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Get survey report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching survey report',
      error: error.message
    });
  }
});

// @desc    Update a survey report
// @route   PUT /api/survey-reports/:id
// @access  Private
const updateSurveyReport = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { collegeName, reportYear, description, status, remarks } = req.body;
    const { id: userId, role } = req.user;

    const report = await SurveyReport.findById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Survey report not found'
      });
    }

    // Check authorization
    if (report.uploadedBy.toString() !== userId && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this report'
      });
    }

    if (collegeName) report.collegeName = collegeName;
    if (reportYear) report.reportYear = reportYear;
    if (description) report.description = description;
    if (status && role === 'admin') report.status = status;
    if (remarks && role === 'admin') report.remarks = remarks;

    // Handle new PDF file
    if (req.file) {
      if (report.pdfFile && report.pdfFile.path) {
        fs.unlink(report.pdfFile.path, (err) => {
          if (err) console.error('Error deleting old file:', err);
        });
      }

      report.pdfFile = {
        filename: req.file.filename,
        path: req.file.path,
        originalName: req.file.originalname,
        size: req.file.size,
        uploadDate: new Date()
      };
    }

    const updatedReport = await report.save();
    await updatedReport.populate('uploadedBy', 'name email');

    res.status(200).json({
      success: true,
      data: updatedReport,
      message: 'Survey report updated successfully'
    });
  } catch (error) {
    console.error('Update survey report error:', error);
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error updating survey report',
      error: error.message
    });
  }
});

// @desc    Delete a survey report
// @route   DELETE /api/survey-reports/:id
// @access  Private/Admin
const deleteSurveyReport = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user;

    const report = await SurveyReport.findById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Survey report not found'
      });
    }

    // Check authorization
    if (report.uploadedBy.toString() !== userId && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this report'
      });
    }

    // Delete file
    if (report.pdfFile && report.pdfFile.path) {
      fs.unlink(report.pdfFile.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }

    // Soft delete
    report.isActive = false;
    await report.save();

    res.status(200).json({
      success: true,
      message: 'Survey report deleted successfully'
    });
  } catch (error) {
    console.error('Delete survey report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting survey report',
      error: error.message
    });
  }
});

// @desc    Download survey report PDF
// @route   GET /api/survey-reports/:id/download
// @access  Public
const downloadSurveyReportPDF = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const report = await SurveyReport.findById(id);

    if (!report || !report.pdfFile) {
      return res.status(404).json({
        success: false,
        message: 'Survey report or PDF not found'
      });
    }

    const filePath = report.pdfFile.path;

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    res.download(filePath, report.pdfFile.originalName);
  } catch (error) {
    console.error('Download PDF error:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading PDF',
      error: error.message
    });
  }
});

// @desc    Get survey report PDF file
// @route   GET /api/survey-reports/:id/pdf
// @access  Public
const getSurveyReportPDF = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const report = await SurveyReport.findById(id);

    if (!report || !report.pdfFile) {
      return res.status(404).json({
        success: false,
        message: 'Survey report or PDF not found'
      });
    }

    const filePath = report.pdfFile.path;

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${report.pdfFile.originalName}"`);
    res.sendFile(filePath);
  } catch (error) {
    console.error('Get PDF error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching PDF',
      error: error.message
    });
  }
});

// @desc    Approve survey report (Admin only)
// @route   PUT /api/survey-reports/:id/approve
// @access  Private/Admin
const approveSurveyReport = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const report = await SurveyReport.findByIdAndUpdate(
      id,
      {
        status: 'approved',
        remarks
      },
      { new: true }
    ).populate('uploadedBy', 'name email');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Survey report not found'
      });
    }

    res.status(200).json({
      success: true,
      data: report,
      message: 'Survey report approved'
    });
  } catch (error) {
    console.error('Approve report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving survey report',
      error: error.message
    });
  }
});

// @desc    Reject survey report (Admin only)
// @route   PUT /api/survey-reports/:id/reject
// @access  Private/Admin
const rejectSurveyReport = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const report = await SurveyReport.findByIdAndUpdate(
      id,
      {
        status: 'rejected',
        remarks
      },
      { new: true }
    ).populate('uploadedBy', 'name email');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Survey report not found'
      });
    }

    res.status(200).json({
      success: true,
      data: report,
      message: 'Survey report rejected'
    });
  } catch (error) {
    console.error('Reject report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting survey report',
      error: error.message
    });
  }
});

// @desc    Get statistics for survey reports
// @route   GET /api/survey-reports/stats/overview
// @access  Private/Admin
const getSurveyReportStats = asyncHandler(async (req, res) => {
  try {
    const stats = await SurveyReport.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $group: {
          _id: null,
          totalReports: { $sum: 1 },
          approvedReports: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          pendingReports: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          rejectedReports: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          },
          totalViews: { $sum: '$viewCount' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: stats[0] || {
        totalReports: 0,
        approvedReports: 0,
        pendingReports: 0,
        rejectedReports: 0,
        totalViews: 0
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

module.exports = {
  createSurveyReport,
  getSurveyReports,
  getSurveyReportById,
  updateSurveyReport,
  deleteSurveyReport,
  downloadSurveyReportPDF,
  getSurveyReportPDF,
  approveSurveyReport,
  rejectSurveyReport,
  getSurveyReportStats
};
