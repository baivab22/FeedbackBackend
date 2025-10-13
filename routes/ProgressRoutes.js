const express = require('express');
const progressController = require('../controllers/ProgressController');

const router = express.Router();

// GET routes
router.get('/', progressController.getAllReports);
router.get('/analytics', progressController.getAnalytics);
router.get('/export/csv', progressController.exportCSV);
router.get('/college/:collegeId', progressController.getReportsByCollege);
router.get('/:id', progressController.getReportById);

// POST routes
router.post('/', progressController.createReport);

// PUT routes
router.put('/:id', progressController.updateReport);

// DELETE routes
router.delete('/:id', progressController.deleteReport);

module.exports = router;