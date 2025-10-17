const ProgressReport = require('../models/ProgressReport');
const fs = require('fs').promises;
const path = require('path');

/**
 * ProgressController
 * Handles all HTTP requests for progress reports with program-wise data and financial status
 */
class ProgressController {
  constructor() {
    this.uploadsDir = path.join(__dirname, '../uploads/approval_letters');
    this.financialUploadsDir = path.join(__dirname, '../uploads/financial_documents');
    this.ensureUploadDirs();
  }

  async ensureUploadDirs() {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
      await fs.mkdir(this.financialUploadsDir, { recursive: true });
    } catch (error) {
      console.error('Error creating upload directories:', error);
    }
  }

  /**
   * GET /api/reports
   * Get all progress reports
   */
  async getAllReports(req, res) {
    try {
      const reports = await ProgressReport.getAllReports();
      res.json({
        success: true,
        data: reports,
        count: reports.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching reports',
        error: error.message
      });
    }
  }

  /**
   * GET /api/reports/:id
   * Get report by ID
   */
  async getReportById(req, res) {
    try {
      const { id } = req.params;
      const report = await ProgressReport.getReportById(id);
      
      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }
      
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching report',
        error: error.message
      });
    }
  }

  /**
   * GET /api/reports/college/:collegeId
   * Get reports by college
   */
  async getReportsByCollege(req, res) {
    try {
      const { collegeId } = req.params;
      const reports = await ProgressReport.getReportsByCollege(collegeId);
      
      res.json({
        success: true,
        data: reports,
        count: reports.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching college reports',
        error: error.message
      });
    }
  }

  /**
   * GET /api/reports/year/:academicYear
   * Get reports by academic year
   */
  async getReportsByYear(req, res) {
    try {
      const { academicYear } = req.params;
      const reports = await ProgressReport.getReportsByAcademicYear(academicYear);
      
      res.json({
        success: true,
        data: reports,
        count: reports.length,
        academicYear
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching reports by year',
        error: error.message
      });
    }
  }

  /**
   * GET /api/reports/program/:programName
   * Get reports by program name
   */
  async getReportsByProgram(req, res) {
    try {
      const { programName } = req.params;
      const reports = await ProgressReport.getReportsByProgram(programName);
      
      res.json({
        success: true,
        data: reports,
        count: reports.length,
        programName
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching reports by program',
        error: error.message
      });
    }
  }

  /**
   * GET /api/reports/college/:collegeId/summary
   * Get college summary
   */
  async getCollegeSummary(req, res) {
    try {
      const { collegeId } = req.params;
      const summary = await ProgressReport.getCollegeSummary(collegeId);
      
      if (!summary) {
        return res.status(404).json({
          success: false,
          message: 'No reports found for this college'
        });
      }
      
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching college summary',
        error: error.message
      });
    }
  }

  /**
   * POST /api/reports
   * Create new progress report
   */
  async createReport(req, res) {
    try {
      const reportData = req.body;
      
      // Basic validation
      if (!reportData.collegeId || !reportData.collegeName || !reportData.academicYear) {
        return res.status(400).json({
          success: false,
          message: 'College ID, College Name, and Academic Year are required'
        });
      }

      // Validate programs array
      if (!reportData.programs || !Array.isArray(reportData.programs) || reportData.programs.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one program is required'
        });
      }

      // Validate each program
      const validationErrors = [];
      for (let i = 0; i < reportData.programs.length; i++) {
        const program = reportData.programs[i];
        const programIndex = i + 1;

        if (!program.programName || program.programName.trim() === '') {
          validationErrors.push(`Program ${programIndex}: Program name is required`);
        }

        // Validate gender distribution
        const maleStudents = program.maleStudents || 0;
        const femaleStudents = program.femaleStudents || 0;
        const totalStudents = program.totalStudents || 0;

        if (maleStudents < 0 || femaleStudents < 0) {
          validationErrors.push(`Program ${programIndex} (${program.programName}): Student counts cannot be negative`);
        }

        if (maleStudents + femaleStudents !== totalStudents) {
          validationErrors.push(
            `Program ${programIndex} (${program.programName}): Male (${maleStudents}) + Female (${femaleStudents}) must equal Total Students (${totalStudents})`
          );
        }

        // Validate scholarship students
        const scholarshipStudents = program.scholarshipStudents || 0;
        if (scholarshipStudents < 0) {
          validationErrors.push(`Program ${programIndex} (${program.programName}): Scholarship students cannot be negative`);
        }

        if (scholarshipStudents > totalStudents) {
          validationErrors.push(
            `Program ${programIndex} (${program.programName}): Scholarship students (${scholarshipStudents}) cannot exceed total students (${totalStudents})`
          );
        }

        // Validate admissions and graduations
        if (program.newAdmissions < 0 || program.graduatedStudents < 0) {
          validationErrors.push(`Program ${programIndex} (${program.programName}): Admissions and graduations cannot be negative`);
        }

        // Validate pass percentage
        if (program.passPercentage < 0 || program.passPercentage > 100) {
          validationErrors.push(`Program ${programIndex} (${program.programName}): Pass percentage must be between 0 and 100`);
        }
      }

      // Simple financial data validation
      if (reportData.financialStatus) {
        const financial = reportData.financialStatus;
        const categories = ['salaries', 'capital', 'operational', 'research'];
        
        for (const category of categories) {
          if (financial[category]) {
            const data = financial[category];
            if (data.annualBudget < 0 || data.actualExpenditure < 0 || data.revenueGenerated < 0) {
              validationErrors.push(`${category}: Financial values cannot be negative`);
            }
          }
        }
      }

      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: validationErrors
        });
      }

      // Validate infrastructure data
      if (reportData.classroomCount < 0 || reportData.labCount < 0 || reportData.libraryBooks < 0) {
        return res.status(400).json({
          success: false,
          message: 'Infrastructure counts cannot be negative'
        });
      }
      
      const newReport = await ProgressReport.createReport(reportData);
      
      res.status(201).json({
        success: true,
        message: 'Progress report created successfully',
        data: newReport
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating report',
        error: error.message
      });
    }
  }

  /**
   * PUT /api/reports/:id
   * Update progress report
   */
  async updateReport(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Validate programs if provided
      if (updateData.programs && Array.isArray(updateData.programs)) {
        const validationErrors = [];
        
        for (let i = 0; i < updateData.programs.length; i++) {
          const program = updateData.programs[i];
          const programIndex = i + 1;

          const maleStudents = program.maleStudents || 0;
          const femaleStudents = program.femaleStudents || 0;
          const totalStudents = program.totalStudents || 0;

          if (maleStudents + femaleStudents !== totalStudents) {
            validationErrors.push(
              `Program ${programIndex} (${program.programName}): Male + Female must equal Total Students`
            );
          }

          if ((program.scholarshipStudents || 0) > totalStudents) {
            validationErrors.push(
              `Program ${programIndex} (${program.programName}): Scholarship students cannot exceed total students`
            );
          }

          if (program.passPercentage < 0 || program.passPercentage > 100) {
            validationErrors.push(
              `Program ${programIndex} (${program.programName}): Pass percentage must be between 0 and 100`
            );
          }
        }

        if (validationErrors.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Validation errors',
            errors: validationErrors
          });
        }
      }

      // Simple financial data validation if provided
      if (updateData.financialStatus) {
        const financial = updateData.financialStatus;
        const categories = ['salaries', 'capital', 'operational', 'research'];
        const financialErrors = [];
        
        for (const category of categories) {
          if (financial[category]) {
            const data = financial[category];
            if (data.annualBudget < 0 || data.actualExpenditure < 0 || data.revenueGenerated < 0) {
              financialErrors.push(`${category}: Financial values cannot be negative`);
            }
          }
        }

        if (financialErrors.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Financial validation errors',
            errors: financialErrors
          });
        }
      }
      
      const updatedReport = await ProgressReport.updateReport(id, updateData);
      
      res.json({
        success: true,
        message: 'Progress report updated successfully',
        data: updatedReport
      });
    } catch (error) {
      if (error.message === 'Report not found') {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error updating report',
        error: error.message
      });
    }
  }

  /**
   * PATCH /api/reports/:reportId/programs/:programName
   * Update a specific program within a report
   */
  async updateProgram(req, res) {
    try {
      const { reportId, programName } = req.params;
      const programData = req.body;

      // Validate program data
      if (programData.maleStudents !== undefined && programData.femaleStudents !== undefined && 
          programData.totalStudents !== undefined) {
        if (programData.maleStudents + programData.femaleStudents !== programData.totalStudents) {
          return res.status(400).json({
            success: false,
            message: 'Male + Female students must equal total students'
          });
        }
      }

      if (programData.scholarshipStudents > programData.totalStudents) {
        return res.status(400).json({
          success: false,
          message: 'Scholarship students cannot exceed total students'
        });
      }

      const updatedReport = await ProgressReport.updateProgram(
        reportId, 
        decodeURIComponent(programName), 
        programData
      );
      
      res.json({
        success: true,
        message: 'Program updated successfully',
        data: updatedReport
      });
    } catch (error) {
      if (error.message === 'Report not found' || error.message === 'Program not found in report') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error updating program',
        error: error.message
      });
    }
  }

  /**
   * PATCH /api/reports/:reportId/financial/:category
   * Update financial status for a specific category
   */
  async updateFinancialStatus(req, res) {
    try {
      const { reportId, category } = req.params;
      const financialData = req.body;

      const validCategories = ['salaries', 'capital', 'operational', 'research'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid financial category. Must be one of: salaries, capital, operational, research'
        });
      }

      // Simple financial data validation
      const financialErrors = [];
      if (financialData.annualBudget < 0 || financialData.actualExpenditure < 0 || financialData.revenueGenerated < 0) {
        financialErrors.push(`${category}: Financial values cannot be negative`);
      }

      if (financialErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Financial validation errors',
          errors: financialErrors
        });
      }

      const updatedReport = await ProgressReport.updateFinancialStatus(
        reportId,
        category,
        financialData
      );
      
      res.json({
        success: true,
        message: 'Financial status updated successfully',
        data: updatedReport
      });
    } catch (error) {
      if (error.message === 'Report not found') {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error updating financial status',
        error: error.message
      });
    }
  }

  /**
   * DELETE /api/reports/:id
   * Delete progress report
   */
  async deleteReport(req, res) {
    try {
      const { id } = req.params;
      const report = await ProgressReport.getReportById(id);
      
      if (report) {
        // Delete associated approval letter files
        for (const program of report.programs || []) {
          if (program.approvalLetterPath) {
            try {
              const fullPath = path.join(__dirname, '..', program.approvalLetterPath);
              await fs.unlink(fullPath);
            } catch (error) {
              console.error('Error deleting approval letter:', error);
              // Continue even if file deletion fails
            }
          }
        }

        // Delete financial documents if they exist
        if (report.financialStatus?.attachments) {
          const attachments = report.financialStatus.attachments;
          if (attachments.auditedFinancialStatements) {
            try {
              const fullPath = path.join(__dirname, '..', attachments.auditedFinancialStatements);
              await fs.unlink(fullPath);
            } catch (error) {
              console.error('Error deleting financial statements:', error);
            }
          }
          if (attachments.budgetCopy) {
            try {
              const fullPath = path.join(__dirname, '..', attachments.budgetCopy);
              await fs.unlink(fullPath);
            } catch (error) {
              console.error('Error deleting budget copy:', error);
            }
          }
        }
      }
      
      await ProgressReport.deleteReport(id);
      
      res.json({
        success: true,
        message: 'Progress report deleted successfully'
      });
    } catch (error) {
      if (error.message === 'Report not found') {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error deleting report',
        error: error.message
      });
    }
  }

  /**
   * GET /api/analytics
   * Get comprehensive analytics data
   */
  async getAnalytics(req, res) {
    try {
      const analytics = await ProgressReport.getAnalytics();
      
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching analytics',
        error: error.message
      });
    }
  }

  /**
   * GET /api/analytics/financial
   * Get financial analytics
   */
  async getFinancialAnalytics(req, res) {
    try {
      const financialAnalytics = await ProgressReport.getFinancialAnalytics();
      
      res.json({
        success: true,
        data: financialAnalytics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching financial analytics',
        error: error.message
      });
    }
  }

  /**
   * GET /api/reports/export/csv
   * Export data as CSV
   */
  async exportCSV(req, res) {
    try {
      const reports = await ProgressReport.getAllReports();
      
      if (reports.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No data to export'
        });
      }

      // Create CSV headers - updated to include financial data
      const headers = [
        'Report ID',
        'College ID',
        'College Name',
        'Academic Year',
        'Program Name',
        'Total Students',
        'Male Students',
        'Female Students',
        'Scholarship Students',
        'Scholarship Rule Applied',
        'New Admissions',
        'Graduated Students',
        'Pass Percentage',
        'Has Approval Letter',
        'Approval Letter Filename',
        // Financial Headers
        'Salaries Budget',
        'Salaries Expenditure',
        'Salaries Revenue',
        'Capital Budget',
        'Capital Expenditure',
        'Capital Revenue',
        'Operational Budget',
        'Operational Expenditure',
        'Operational Revenue',
        'Research Budget',
        'Research Expenditure',
        'Research Revenue',
        'Total Annual Budget',
        'Total Actual Expenditure',
        'Total Revenue Generated',
        'Budget Utilization %',
        'Building Status',
        'Classroom Count',
        'Lab Count',
        'Library Books',
        'Submission Date',
        'Created At',
        'Updated At'
      ];

      // Create CSV rows - one row per program
      const csvRows = [headers.join(',')];
      
      reports.forEach(report => {
        const financial = report.financialStatus || {};
        const budgetUtil = financial.totalAnnualBudget > 0 
          ? ((financial.totalActualExpenditure / financial.totalAnnualBudget) * 100).toFixed(2)
          : '0.00';

        if (report.programs && report.programs.length > 0) {
          report.programs.forEach(program => {
            const row = [
              report.id,
              report.collegeId,
              `"${report.collegeName.replace(/"/g, '""')}"`,
              report.academicYear,
              `"${program.programName.replace(/"/g, '""')}"`,
              program.totalStudents || 0,
              program.maleStudents || 0,
              program.femaleStudents || 0,
              program.scholarshipStudents || 0,
              program.isScholarshipRuleApplied ? 'Yes' : 'No',
              program.newAdmissions || 0,
              program.graduatedStudents || 0,
              (program.passPercentage || 0).toFixed(2),
              program.approvalLetterPath ? 'Yes' : 'No',
              program.approvalLetterFilename ? `"${program.approvalLetterFilename.replace(/"/g, '""')}"` : '',
              // Financial Data
              financial.salaries?.annualBudget || 0,
              financial.salaries?.actualExpenditure || 0,
              financial.salaries?.revenueGenerated || 0,
              financial.capital?.annualBudget || 0,
              financial.capital?.actualExpenditure || 0,
              financial.capital?.revenueGenerated || 0,
              financial.operational?.annualBudget || 0,
              financial.operational?.actualExpenditure || 0,
              financial.operational?.revenueGenerated || 0,
              financial.research?.annualBudget || 0,
              financial.research?.actualExpenditure || 0,
              financial.research?.revenueGenerated || 0,
              financial.totalAnnualBudget || 0,
              financial.totalActualExpenditure || 0,
              financial.totalRevenueGenerated || 0,
              budgetUtil,
              `"${(report.buildingStatus || '').replace(/"/g, '""')}"`,
              report.classroomCount || 0,
              report.labCount || 0,
              report.libraryBooks || 0,
              report.submissionDate || '',
              report.createdAt || '',
              report.updatedAt || ''
            ];
            csvRows.push(row.join(','));
          });
        } else {
          // Report with no programs
          const row = [
            report.id,
            report.collegeId,
            `"${report.collegeName.replace(/"/g, '""')}"`,
            report.academicYear,
            'N/A',
            report.totalStudents || 0,
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            // Financial Data
            financial.salaries?.annualBudget || 0,
            financial.salaries?.actualExpenditure || 0,
            financial.salaries?.revenueGenerated || 0,
            financial.capital?.annualBudget || 0,
            financial.capital?.actualExpenditure || 0,
            financial.capital?.revenueGenerated || 0,
            financial.operational?.annualBudget || 0,
            financial.operational?.actualExpenditure || 0,
            financial.operational?.revenueGenerated || 0,
            financial.research?.annualBudget || 0,
            financial.research?.actualExpenditure || 0,
            financial.research?.revenueGenerated || 0,
            financial.totalAnnualBudget || 0,
            financial.totalActualExpenditure || 0,
            financial.totalRevenueGenerated || 0,
            budgetUtil,
            `"${(report.buildingStatus || '').replace(/"/g, '""')}"`,
            report.classroomCount || 0,
            report.labCount || 0,
            report.libraryBooks || 0,
            report.submissionDate || '',
            report.createdAt || '',
            report.updatedAt || ''
          ];
          csvRows.push(row.join(','));
        }
      });

      const csvContent = csvRows.join('\n');
      const filename = `progress_reports_${new Date().toISOString().split('T')[0]}.csv`;
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send('\uFEFF' + csvContent); // Add BOM for Excel UTF-8 support
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error exporting CSV',
        error: error.message
      });
    }
  }

  /**
   * GET /api/reports/:reportId/programs/:programName/approval-letter
   * Download approval letter for a specific program
   */
  async downloadApprovalLetter(req, res) {
    try {
      const { reportId, programName } = req.params;
      const report = await ProgressReport.getReportById(reportId);
      
      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }

      const decodedProgramName = decodeURIComponent(programName);
      const program = report.programs?.find(p => p.programName === decodedProgramName);
      
      if (!program || !program.approvalLetterPath) {
        return res.status(404).json({
          success: false,
          message: 'Approval letter not found for this program'
        });
      }

      const filePath = path.join(__dirname, '..', program.approvalLetterPath);
      
      try {
        await fs.access(filePath);
        const filename = program.approvalLetterFilename || `${program.programName}_approval.pdf`;
        res.download(filePath, filename);
      } catch {
        return res.status(404).json({
          success: false,
          message: 'Approval letter file not found on server'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error downloading approval letter',
        error: error.message
      });
    }
  }

  /**
   * POST /api/reports/:reportId/programs/:programName/approval-letter
   * Upload approval letter for a specific program
   * Note: Requires multer middleware for file upload
   */
  async uploadApprovalLetter(req, res) {
    try {
      const { reportId, programName } = req.params;
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const report = await ProgressReport.getReportById(reportId);
      
      if (!report) {
        // Delete uploaded file if report not found
        await fs.unlink(req.file.path);
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }

      const decodedProgramName = decodeURIComponent(programName);
      const programIndex = report.programs?.findIndex(p => p.programName === decodedProgramName);
      
      if (programIndex === -1) {
        // Delete uploaded file if program not found
        await fs.unlink(req.file.path);
        return res.status(404).json({
          success: false,
          message: 'Program not found in report'
        });
      }

      // Delete old approval letter if exists
      if (report.programs[programIndex].approvalLetterPath) {
        try {
          const oldPath = path.join(__dirname, '..', report.programs[programIndex].approvalLetterPath);
          await fs.unlink(oldPath);
        } catch (error) {
          console.error('Error deleting old approval letter:', error);
        }
      }

      // Update program with new file path
      const relativePath = `/uploads/approval_letters/${req.file.filename}`;
      report.programs[programIndex].approvalLetterPath = relativePath;
      report.programs[programIndex].approvalLetterFilename = req.file.originalname;

      const updatedReport = await ProgressReport.updateReport(reportId, {
        programs: report.programs
      });
      
      res.json({
        success: true,
        message: 'Approval letter uploaded successfully',
        data: {
          programName: decodedProgramName,
          filePath: relativePath,
          filename: req.file.originalname
        }
      });
    } catch (error) {
      // Clean up uploaded file on error
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error('Error deleting uploaded file:', unlinkError);
        }
      }
      
      res.status(500).json({
        success: false,
        message: 'Error uploading approval letter',
        error: error.message
      });
    }
  }

  /**
   * POST /api/reports/:reportId/financial/attachments
   * Upload financial documents (audited financial statements and budget copy)
   * Note: Requires multer middleware for file upload
   */
  async uploadFinancialDocuments(req, res) {
    try {
      const { reportId } = req.params;
      
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded'
        });
      }

      const report = await ProgressReport.getReportById(reportId);
      
      if (!report) {
        // Delete uploaded files if report not found
        for (const file of Object.values(req.files)) {
          await fs.unlink(file.path);
        }
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }

      const attachments = {};
      const uploadedFiles = [];

      try {
        // Process audited financial statements
        if (req.files.auditedFinancialStatements) {
          const file = req.files.auditedFinancialStatements[0];
          const relativePath = `/uploads/financial_documents/${file.filename}`;
          
          // Delete old file if exists
          if (report.financialStatus?.attachments?.auditedFinancialStatements) {
            const oldPath = path.join(__dirname, '..', report.financialStatus.attachments.auditedFinancialStatements);
            await fs.unlink(oldPath);
          }
          
          attachments.auditedFinancialStatements = relativePath;
          attachments.auditedFinancialStatementsFilename = file.originalname;
          uploadedFiles.push(file);
        }

        // Process budget copy
        if (req.files.budgetCopy) {
          const file = req.files.budgetCopy[0];
          const relativePath = `/uploads/financial_documents/${file.filename}`;
          
          // Delete old file if exists
          if (report.financialStatus?.attachments?.budgetCopy) {
            const oldPath = path.join(__dirname, '..', report.financialStatus.attachments.budgetCopy);
            await fs.unlink(oldPath);
          }
          
          attachments.budgetCopy = relativePath;
          attachments.budgetCopyFilename = file.originalname;
          uploadedFiles.push(file);
        }

        const updatedReport = await ProgressReport.updateFinancialAttachments(reportId, attachments);
        
        res.json({
          success: true,
          message: 'Financial documents uploaded successfully',
          data: {
            attachments: updatedReport.financialStatus.attachments
          }
        });

      } catch (error) {
        // Clean up uploaded files on error
        for (const file of uploadedFiles) {
          await fs.unlink(file.path);
        }
        throw error;
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error uploading financial documents',
        error: error.message
      });
    }
  }

  /**
   * GET /api/reports/:reportId/financial/attachments/:documentType
   * Download financial documents
   */
  async downloadFinancialDocument(req, res) {
    try {
      const { reportId, documentType } = req.params;
      
      const validTypes = ['auditedFinancialStatements', 'budgetCopy'];
      if (!validTypes.includes(documentType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid document type. Must be one of: auditedFinancialStatements, budgetCopy'
        });
      }

      const report = await ProgressReport.getReportById(reportId);
      
      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }

      const attachment = report.financialStatus?.attachments?.[documentType];
      const filename = report.financialStatus?.attachments?.[`${documentType}Filename`];
      
      if (!attachment) {
        return res.status(404).json({
          success: false,
          message: `${documentType.replace(/([A-Z])/g, ' $1')} not found`
        });
      }

      const filePath = path.join(__dirname, '..', attachment);
      
      try {
        await fs.access(filePath);
        const downloadFilename = filename || `${documentType}_${report.collegeName}.pdf`;
        res.download(filePath, downloadFilename);
      } catch {
        return res.status(404).json({
          success: false,
          message: 'Financial document file not found on server'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error downloading financial document',
        error: error.message
      });
    }
  }
}

module.exports = new ProgressController();