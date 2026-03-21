const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyJWT, requireRole } = require('../middleware/auth');
const {
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
} = require('../controllers/surveyReport.controller');

const router = express.Router();

// Multer setup for PDF uploads
const pdfUploadDir = path.join(__dirname, '..', 'uploads', 'survey_reports');
if (!fs.existsSync(pdfUploadDir)) {
  fs.mkdirSync(pdfUploadDir, { recursive: true });
}

const pdfStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, pdfUploadDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const safe = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${unique}-${safe}`);
  }
});

const pdfUpload = multer({
  storage: pdfStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      return cb(null, true);
    }
    return cb(new Error('Only PDF files are allowed'));
  }
});

// Public Routes
// GET all survey reports with filters and sorting
router.get('/survey-reports', getSurveyReports);

// GET single survey report by ID
router.get('/survey-reports/:id', getSurveyReportById);

// GET PDF file for viewing
router.get('/survey-reports/:id/pdf', getSurveyReportPDF);

// GET download PDF
router.get('/survey-reports/:id/download', downloadSurveyReportPDF);

// Protected Routes (Requires Authentication)
// CREATE new survey report
router.post(
  '/survey-reports',
  verifyJWT,
  requireRole('admin'),
  pdfUpload.single('pdfFile'),
  createSurveyReport
);

// UPDATE survey report
router.put(
  '/survey-reports/:id',
  verifyJWT,
  requireRole('admin'),
  pdfUpload.single('pdfFile'),
  updateSurveyReport
);

// DELETE survey report
router.delete(
  '/survey-reports/:id',
  verifyJWT,
  requireRole('admin'),
  deleteSurveyReport
);

// Admin Routes
// APPROVE survey report
router.put(
  '/survey-reports/:id/approve',
  verifyJWT,
  requireRole('admin'),
  approveSurveyReport
);

// REJECT survey report
router.put(
  '/survey-reports/:id/reject',
  verifyJWT,
  requireRole('admin'),
  rejectSurveyReport
);

// GET statistics
router.get(
  '/survey-reports/stats/overview',
  verifyJWT,
  requireRole('admin'),
  getSurveyReportStats
);

module.exports = router;
