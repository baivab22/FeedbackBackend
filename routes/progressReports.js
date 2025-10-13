const express = require('express');
const router = express.Router();
const ProgressReport = require('../models/ProgressReport');

// Get all reports
router.get('/', async (req, res) => {
  try {
    const reports = await ProgressReport.find().sort({ submissionDate: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get report by ID
router.get('/:id', async (req, res) => {
  try {
    const report = await ProgressReport.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new report
router.post('/', async (req, res) => {
  try {
    const report = new ProgressReport(req.body);
    const savedReport = await report.save();
    res.status(201).json(savedReport);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update report
router.put('/:id', async (req, res) => {
  try {
    const report = await ProgressReport.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!report) return res.status(404).json({ message: 'Report not found' });
    res.json(report);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete report
router.delete('/:id', async (req, res) => {
  try {
    const report = await ProgressReport.findByIdAndDelete(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get analytics data
router.get('/analytics/summary', async (req, res) => {
  try {
    const reports = await ProgressReport.find();
    
    const analytics = {
      totalColleges: reports.length,
      totalBudget: reports.reduce((sum, r) => sum + (r.totalAllocatedBudget || 0), 0),
      totalExpenditure: reports.reduce((sum, r) => sum + (r.totalSpentBudget || 0), 0),
      avgFacultyTraining: reports.reduce((sum, r) => sum + (r.facultyDevelopment?.trainingAttended || 0), 0) / reports.length,
      avgFacultyResearch: reports.reduce((sum, r) => sum + (r.facultyDevelopment?.researchInvolved || 0), 0) / reports.length,
      collegeStats: reports.map(r => ({
        name: r.collegeName,
        budget: r.totalAllocatedBudget || 0,
        expenditure: r.totalSpentBudget || 0,
        students: r.studentCount || 0,
        training: r.facultyDevelopment?.trainingAttended || 0,
        research: r.facultyDevelopment?.researchInvolved || 0
      }))
    };
    
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;