const fs = require('fs').promises;
const path = require('path');

class ProgressReport {
  constructor() {
    this.dataFile = path.join(__dirname, '../data/progress_reports.json');
    this.ensureDataFile();
  }

  async ensureDataFile() {
    try {
      const dir = path.dirname(this.dataFile);
      await fs.mkdir(dir, { recursive: true });
      
      try {
        await fs.access(this.dataFile);
      } catch {
        await fs.writeFile(this.dataFile, JSON.stringify([]));
      }
    } catch (error) {
      console.error('Error ensuring data file:', error);
    }
  }

  async getAllReports() {
    try {
      const data = await fs.readFile(this.dataFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading reports:', error);
      return [];
    }
  }

  async getReportById(id) {
    const reports = await this.getAllReports();
    return reports.find(report => report.id === id);
  }

  async getReportsByCollege(collegeId) {
    const reports = await this.getAllReports();
    return reports.filter(report => report.collegeId === collegeId);
  }

  async createReport(reportData) {
    const reports = await this.getAllReports();
    const newReport = {
      id: Date.now().toString(),
      ...reportData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    reports.push(newReport);
    await fs.writeFile(this.dataFile, JSON.stringify(reports, null, 2));
    return newReport;
  }

  async updateReport(id, updateData) {
    const reports = await this.getAllReports();
    const index = reports.findIndex(report => report.id === id);
    
    if (index === -1) {
      throw new Error('Report not found');
    }
    
    reports[index] = {
      ...reports[index],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    await fs.writeFile(this.dataFile, JSON.stringify(reports, null, 2));
    return reports[index];
  }

  async deleteReport(id) {
    const reports = await this.getAllReports();
    const filteredReports = reports.filter(report => report.id !== id);
    
    if (reports.length === filteredReports.length) {
      throw new Error('Report not found');
    }
    
    await fs.writeFile(this.dataFile, JSON.stringify(filteredReports, null, 2));
    return true;
  }

  async getAnalytics() {
    const reports = await this.getAllReports();
    
    if (reports.length === 0) {
      return {
        totalColleges: 0,
        totalStudents: 0,
        totalBudget: 0,
        averagePassRate: 0,
        budgetUtilization: 0,
        collegePerformance: []
      };
    }

    const collegeMap = new Map();
    
    reports.forEach(report => {
      if (!collegeMap.has(report.collegeId)) {
        collegeMap.set(report.collegeId, {
          collegeId: report.collegeId,
          collegeName: report.collegeName,
          reports: [],
          totalReports: 0
        });
      }
      collegeMap.get(report.collegeId).reports.push(report);
      collegeMap.get(report.collegeId).totalReports++;
    });

    const collegePerformance = Array.from(collegeMap.values()).map(college => {
      const latestReport = college.reports.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      )[0];
      
      const budgetUtilization = latestReport.approvedBudget > 0 
        ? (latestReport.actualExpenditure / latestReport.approvedBudget) * 100 
        : 0;
      
      const avgStudentGrowth = college.reports.length > 1 
        ? ((latestReport.totalStudents - college.reports[college.reports.length - 1].totalStudents) / college.reports[college.reports.length - 1].totalStudents) * 100
        : 0;

      return {
        collegeId: college.collegeId,
        collegeName: college.collegeName,
        totalReports: college.totalReports,
        latestReport,
        budgetUtilization: Math.round(budgetUtilization),
        studentGrowth: Math.round(avgStudentGrowth)
      };
    });

    const totalStudents = reports.reduce((sum, report) => sum + report.totalStudents, 0);
    const totalBudget = reports.reduce((sum, report) => sum + report.approvedBudget, 0);
    const totalExpenditure = reports.reduce((sum, report) => sum + report.actualExpenditure, 0);
    const averagePassRate = reports.reduce((sum, report) => sum + report.passPercentage, 0) / reports.length;

    return {
      totalColleges: collegeMap.size,
      totalStudents,
      totalBudget,
      averagePassRate: Math.round(averagePassRate),
      budgetUtilization: totalBudget > 0 ? Math.round((totalExpenditure / totalBudget) * 100) : 0,
      collegePerformance
    };
  }
}

module.exports = new ProgressReport();