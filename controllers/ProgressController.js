const ProgressReport = require('../models/ProgressReport');

class ProgressController {
  // Get all progress reports
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

  // Get report by ID
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

  // Get reports by college
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
      });
    }
  }

  // Create new progress report
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

  // Update progress report
  async updateReport(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
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

  // Delete progress report
  async deleteReport(req, res) {
    try {
      const { id } = req.params;
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

  // Get analytics data
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

  // Export data as CSV
  async exportCSV(req, res) {
    try {
      const reports = await ProgressReport.getAllReports();
      
      if (reports.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No data to export'
        });
      }

      // Create CSV headers
      const headers = [
        'College ID', 'College Name', 'Academic Year', 'Total Students', 
        'New Admissions', 'Graduated Students', 'Pass Percentage',
        'Approved Budget', 'Actual Expenditure', 'Revenue Generated',
        'Building Status', 'Classroom Count', 'Lab Count', 'Library Books',
        'Submission Date'
      ];

      // Create CSV rows
      const csvRows = [
        headers.join(','),
        ...reports.map(report => [
          report.collegeId,
          `"${report.collegeName}"`,
          report.academicYear,
          report.totalStudents,
          report.newAdmissions,
          report.graduatedStudents,
          report.passPercentage,
          report.approvedBudget,
          report.actualExpenditure,
          report.revenueGenerated,
          `"${report.buildingStatus}"`,
          report.classroomCount,
          report.labCount,
          report.libraryBooks,
          report.submissionDate
        ].join(','))
      ];

      const csvContent = csvRows.join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=progress_reports.csv');
      res.send(csvContent);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error exporting CSV',
        error: error.message
      });
    }
  }
}

module.exports = new ProgressController();