const express = require('express');
const router = express.Router();
const collegeFormController = require('../controllers/collegeForm.controller');

// Create new college form
router.post('/college-forms', collegeFormController.createCollegeForm);

// Get all college forms with filtering and pagination
router.get('/college-forms', collegeFormController.getAllCollegeForms);

// Get college form by ID
router.get('/college-forms/:id', collegeFormController.getCollegeFormById);

// Get college form by college ID
router.get('/college-forms/college/:collegeId', collegeFormController.getCollegeFormByCollegeId);

// Update college form
router.put('/college-forms/:id', collegeFormController.updateCollegeForm);

// Submit college form
router.patch('/college-forms/:id/submit', collegeFormController.submitCollegeForm);

// Save as draft
router.patch('/college-forms/:id/draft', collegeFormController.saveDraft);

// Delete college form
router.delete('/college-forms/:id', collegeFormController.deleteCollegeForm);

// Get form statistics
router.get('/college-forms-stats', collegeFormController.getFormStatistics);

// Search college forms
router.get('/college-forms-search', collegeFormController.searchCollegeForms);

module.exports = router;