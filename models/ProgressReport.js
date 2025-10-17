const fs = require('fs').promises;
const path = require('path');

/**
 * ProgressReport Model
 * Handles all data operations for college progress reports with program-wise tracking and financial data
 */
class ProgressReport {
  constructor() {
    this.dataFile = path.join(__dirname, '../data/progress_reports.json');
    this.ensureDataFile();
  }

  /**
   * Ensures the data file and directory exist
   */
  async ensureDataFile() {
    try {
      const dir = path.dirname(this.dataFile);
      await fs.mkdir(dir, { recursive: true });
      
      try {
        await fs.access(this.dataFile);
      } catch {
        await fs.writeFile(this.dataFile, JSON.stringify([], null, 2));
      }
    } catch (error) {
      console.error('Error ensuring data file:', error);
    }
  }

  /**
   * Get all progress reports
   * @returns {Promise<Array>} Array of all reports
   */
  async getAllReports() {
    try {
      const data = await fs.readFile(this.dataFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading reports:', error);
      return [];
    }
  }

  /**
   * Get a single report by ID
   * @param {string} id - Report ID
   * @returns {Promise<Object|undefined>} Report object or undefined
   */
  async getReportById(id) {
    const reports = await this.getAllReports();
    return reports.find(report => report.id === id);
  }

  /**
   * Get all reports for a specific college
   * @param {string} collegeId - College ID
   * @returns {Promise<Array>} Array of reports for the college
   */
  async getReportsByCollege(collegeId) {
    const reports = await this.getAllReports();
    return reports.filter(report => report.collegeId === collegeId);
  }

  /**
   * Get reports by academic year
   * @param {string} academicYear - Academic year (e.g., "2024-2025")
   * @returns {Promise<Array>} Array of reports for the academic year
   */
  async getReportsByAcademicYear(academicYear) {
    const reports = await this.getAllReports();
    return reports.filter(report => report.academicYear === academicYear);
  }

  /**
   * Get reports by program name across all colleges
   * @param {string} programName - Program name (e.g., "BSC", "BBA")
   * @returns {Promise<Array>} Array of reports containing the program
   */
  async getReportsByProgram(programName) {
    const reports = await this.getAllReports();
    return reports.filter(report => 
      report.programs?.some(program => 
        program.programName.toLowerCase() === programName.toLowerCase()
      )
    );
  }

  /**
   * Create a new progress report
   * @param {Object} reportData - Report data
   * @returns {Promise<Object>} Created report
   */
  async createReport(reportData) {
    const reports = await this.getAllReports();
    
    // Validate and process programs
    const processedPrograms = (reportData.programs || []).map(program => ({
      programName: program.programName || '',
      totalStudents: program.totalStudents || 0,
      maleStudents: program.maleStudents || 0,
      femaleStudents: program.femaleStudents || 0,
      scholarshipStudents: program.scholarshipStudents || 0,
      isScholarshipRuleApplied: program.isScholarshipRuleApplied || false,
      newAdmissions: program.newAdmissions || 0,
      graduatedStudents: program.graduatedStudents || 0,
      passPercentage: program.passPercentage || 0,
      approvalLetterPath: program.approvalLetterPath || null,
      approvalLetterFilename: program.approvalLetterFilename || null
    }));
    
    // Calculate total students from all programs
    const totalStudents = processedPrograms.reduce((sum, program) => 
      sum + (program.totalStudents || 0), 0);
    
    // Process financial data
    const financialData = this.processFinancialData(reportData.financialStatus || {});
    
    const newReport = {
      id: Date.now().toString(),
      ...reportData,
      programs: processedPrograms,
      totalStudents,
      financialStatus: financialData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    reports.push(newReport);
    await fs.writeFile(this.dataFile, JSON.stringify(reports, null, 2));
    return newReport;
  }

  /**
   * Process and validate financial status data
   * @param {Object} financialData - Raw financial data
   * @returns {Object} Processed financial data
   */
  processFinancialData(financialData) {
    const defaultFinancial = {
      salaries: { annualBudget: 0, actualExpenditure: 0, revenueGenerated: 0, sources: [] },
      capital: { annualBudget: 0, actualExpenditure: 0, revenueGenerated: 0, sources: [] },
      operational: { annualBudget: 0, actualExpenditure: 0, revenueGenerated: 0, sources: [] },
      research: { annualBudget: 0, actualExpenditure: 0, revenueGenerated: 0, sources: [] },
      attachments: {
        auditedFinancialStatements: null,
        auditedFinancialStatementsFilename: null,
        budgetCopy: null,
        budgetCopyFilename: null
      }
    };

    const processed = {
      salaries: { ...defaultFinancial.salaries, ...financialData.salaries },
      capital: { ...defaultFinancial.capital, ...financialData.capital },
      operational: { ...defaultFinancial.operational, ...financialData.operational },
      research: { ...defaultFinancial.research, ...financialData.research },
      attachments: { ...defaultFinancial.attachments, ...financialData.attachments }
    };

    // Calculate totals
    processed.totalAnnualBudget = 
      processed.salaries.annualBudget + 
      processed.capital.annualBudget + 
      processed.operational.annualBudget + 
      processed.research.annualBudget;

    processed.totalActualExpenditure = 
      processed.salaries.actualExpenditure + 
      processed.capital.actualExpenditure + 
      processed.operational.actualExpenditure + 
      processed.research.actualExpenditure;

    processed.totalRevenueGenerated = 
      processed.salaries.revenueGenerated + 
      processed.capital.revenueGenerated + 
      processed.operational.revenueGenerated + 
      processed.research.revenueGenerated;

    return processed;
  }

  /**
   * Update an existing progress report
   * @param {string} id - Report ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated report
   */
  async updateReport(id, updateData) {
    const reports = await this.getAllReports();
    const index = reports.findIndex(report => report.id === id);
    
    if (index === -1) {
      throw new Error('Report not found');
    }
    
    // Recalculate total students if programs are updated
    if (updateData.programs) {
      updateData.totalStudents = updateData.programs.reduce((sum, program) => 
        sum + (program.totalStudents || 0), 0);
    }

    // Process financial data if updated
    if (updateData.financialStatus) {
      updateData.financialStatus = this.processFinancialData(updateData.financialStatus);
    }
    
    reports[index] = {
      ...reports[index],
      ...updateData,
      id: reports[index].id, // Preserve original ID
      createdAt: reports[index].createdAt, // Preserve creation date
      updatedAt: new Date().toISOString()
    };
    
    await fs.writeFile(this.dataFile, JSON.stringify(reports, null, 2));
    return reports[index];
  }

  /**
   * Update a specific program within a report
   * @param {string} reportId - Report ID
   * @param {string} programName - Program name to update
   * @param {Object} programData - Updated program data
   * @returns {Promise<Object>} Updated report
   */
  async updateProgram(reportId, programName, programData) {
    const report = await this.getReportById(reportId);
    
    if (!report) {
      throw new Error('Report not found');
    }
    
    const programIndex = report.programs.findIndex(
      p => p.programName === programName
    );
    
    if (programIndex === -1) {
      throw new Error('Program not found in report');
    }
    
    report.programs[programIndex] = {
      ...report.programs[programIndex],
      ...programData
    };
    
    return await this.updateReport(reportId, { programs: report.programs });
  }

  /**
   * Update financial status for a report
   * @param {string} reportId - Report ID
   * @param {string} category - Financial category (salaries, capital, operational, research)
   * @param {Object} financialData - Updated financial data
   * @returns {Promise<Object>} Updated report
   */
  async updateFinancialStatus(reportId, category, financialData) {
    const report = await this.getReportById(reportId);
    
    if (!report) {
      throw new Error('Report not found');
    }

    const validCategories = ['salaries', 'capital', 'operational', 'research'];
    if (!validCategories.includes(category)) {
      throw new Error('Invalid financial category');
    }

    const updatedFinancialStatus = {
      ...report.financialStatus,
      [category]: {
        ...report.financialStatus[category],
        ...financialData
      }
    };

    return await this.updateReport(reportId, { financialStatus: updatedFinancialStatus });
  }

  /**
   * Update financial attachments for a report
   * @param {string} reportId - Report ID
   * @param {Object} attachments - Attachment data
   * @returns {Promise<Object>} Updated report
   */
  async updateFinancialAttachments(reportId, attachments) {
    const report = await this.getReportById(reportId);
    
    if (!report) {
      throw new Error('Report not found');
    }

    const updatedFinancialStatus = {
      ...report.financialStatus,
      attachments: {
        ...report.financialStatus.attachments,
        ...attachments
      }
    };

    return await this.updateReport(reportId, { financialStatus: updatedFinancialStatus });
  }

  /**
   * Delete a progress report
   * @param {string} id - Report ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteReport(id) {
    const reports = await this.getAllReports();
    const filteredReports = reports.filter(report => report.id !== id);
    
    if (reports.length === filteredReports.length) {
      throw new Error('Report not found');
    }
    
    await fs.writeFile(this.dataFile, JSON.stringify(filteredReports, null, 2));
    return true;
  }

  /**
   * Get comprehensive analytics across all reports
   * @returns {Promise<Object>} Analytics data
   */
  async getAnalytics() {
    const reports = await this.getAllReports();
    
    if (reports.length === 0) {
      return {
        totalColleges: 0,
        totalReports: 0,
        totalStudents: 0,
        totalMaleStudents: 0,
        totalFemaleStudents: 0,
        totalScholarshipStudents: 0,
        scholarshipPercentage: 0,
        financialSummary: {
          totalAnnualBudget: 0,
          totalActualExpenditure: 0,
          totalRevenueGenerated: 0,
          budgetUtilization: 0,
          categoryBreakdown: {
            salaries: { budget: 0, expenditure: 0, revenue: 0 },
            capital: { budget: 0, expenditure: 0, revenue: 0 },
            operational: { budget: 0, expenditure: 0, revenue: 0 },
            research: { budget: 0, expenditure: 0, revenue: 0 }
          }
        },
        averagePassRate: 0,
        programDistribution: [],
        collegePerformance: [],
        yearlyTrends: []
      };
    }

    const collegeMap = new Map();
    const programStats = new Map();
    const yearMap = new Map();
    
    let totalMaleStudents = 0;
    let totalFemaleStudents = 0;
    let totalScholarshipStudents = 0;
    let totalPassRateSum = 0;
    let totalProgramCount = 0;

    // Financial aggregates
    const financialSummary = {
      totalAnnualBudget: 0,
      totalActualExpenditure: 0,
      totalRevenueGenerated: 0,
      categoryBreakdown: {
        salaries: { budget: 0, expenditure: 0, revenue: 0 },
        capital: { budget: 0, expenditure: 0, revenue: 0 },
        operational: { budget: 0, expenditure: 0, revenue: 0 },
        research: { budget: 0, expenditure: 0, revenue: 0 }
      }
    };
    
    reports.forEach(report => {
      // College aggregation
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

      // Year aggregation
      if (!yearMap.has(report.academicYear)) {
        yearMap.set(report.academicYear, {
          year: report.academicYear,
          totalStudents: 0,
          totalMale: 0,
          totalFemale: 0,
          totalScholarship: 0,
          financial: {
            totalAnnualBudget: 0,
            totalActualExpenditure: 0,
            totalRevenueGenerated: 0
          },
          reportCount: 0
        });
      }
      const yearData = yearMap.get(report.academicYear);
      yearData.reportCount++;

      // Financial aggregation
      if (report.financialStatus) {
        const fs = report.financialStatus;
        financialSummary.totalAnnualBudget += fs.totalAnnualBudget || 0;
        financialSummary.totalActualExpenditure += fs.totalActualExpenditure || 0;
        financialSummary.totalRevenueGenerated += fs.totalRevenueGenerated || 0;

        // Year financial data
        yearData.financial.totalAnnualBudget += fs.totalAnnualBudget || 0;
        yearData.financial.totalActualExpenditure += fs.totalActualExpenditure || 0;
        yearData.financial.totalRevenueGenerated += fs.totalRevenueGenerated || 0;

        // Category breakdown
        ['salaries', 'capital', 'operational', 'research'].forEach(category => {
          if (fs[category]) {
            financialSummary.categoryBreakdown[category].budget += fs[category].annualBudget || 0;
            financialSummary.categoryBreakdown[category].expenditure += fs[category].actualExpenditure || 0;
            financialSummary.categoryBreakdown[category].revenue += fs[category].revenueGenerated || 0;
          }
        });
      }

      // Program aggregation
      report.programs?.forEach(program => {
        const male = program.maleStudents || 0;
        const female = program.femaleStudents || 0;
        const scholarship = program.scholarshipStudents || 0;
        
        totalMaleStudents += male;
        totalFemaleStudents += female;
        totalScholarshipStudents += scholarship;
        totalPassRateSum += program.passPercentage || 0;
        totalProgramCount++;

        // Year-wise student data
        yearData.totalStudents += program.totalStudents || 0;
        yearData.totalMale += male;
        yearData.totalFemale += female;
        yearData.totalScholarship += scholarship;

        // Program statistics
        if (!programStats.has(program.programName)) {
          programStats.set(program.programName, {
            programName: program.programName,
            totalStudents: 0,
            maleStudents: 0,
            femaleStudents: 0,
            scholarshipStudents: 0,
            newAdmissions: 0,
            graduatedStudents: 0,
            totalPassRate: 0,
            programCount: 0,
            colleges: new Set()
          });
        }
        
        const stats = programStats.get(program.programName);
        stats.totalStudents += program.totalStudents || 0;
        stats.maleStudents += male;
        stats.femaleStudents += female;
        stats.scholarshipStudents += scholarship;
        stats.newAdmissions += program.newAdmissions || 0;
        stats.graduatedStudents += program.graduatedStudents || 0;
        stats.totalPassRate += program.passPercentage || 0;
        stats.programCount++;
        stats.colleges.add(report.collegeId);
      });
    });

    // Calculate budget utilization
    financialSummary.budgetUtilization = financialSummary.totalAnnualBudget > 0 
      ? Math.round((financialSummary.totalActualExpenditure / financialSummary.totalAnnualBudget) * 100 * 100) / 100 
      : 0;

    // Process program distribution
    const programDistribution = Array.from(programStats.values()).map(stats => ({
      programName: stats.programName,
      totalStudents: stats.totalStudents,
      maleStudents: stats.maleStudents,
      femaleStudents: stats.femaleStudents,
      scholarshipStudents: stats.scholarshipStudents,
      scholarshipPercentage: stats.totalStudents > 0 
        ? Math.round((stats.scholarshipStudents / stats.totalStudents) * 100 * 100) / 100 
        : 0,
      newAdmissions: stats.newAdmissions,
      graduatedStudents: stats.graduatedStudents,
      averagePassRate: stats.programCount > 0 
        ? Math.round((stats.totalPassRate / stats.programCount) * 100) / 100 
        : 0,
      collegeCount: stats.colleges.size
    }));

    // Process college performance
    const collegePerformance = Array.from(collegeMap.values()).map(college => {
      const latestReport = college.reports.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      )[0];
      
      const budgetUtilization = latestReport.financialStatus?.totalAnnualBudget > 0 
        ? (latestReport.financialStatus.totalActualExpenditure / latestReport.financialStatus.totalAnnualBudget) * 100 
        : 0;
      
      let avgStudentGrowth = 0;
      if (college.reports.length > 1) {
        const sortedReports = college.reports.sort((a, b) => 
          new Date(a.createdAt) - new Date(b.createdAt)
        );
        const oldestReport = sortedReports[0];
        if (oldestReport.totalStudents > 0) {
          avgStudentGrowth = ((latestReport.totalStudents - oldestReport.totalStudents) / 
            oldestReport.totalStudents) * 100;
        }
      }

      // Calculate program-wise statistics for this college
      const programSummary = latestReport.programs?.map(program => ({
        programName: program.programName,
        totalStudents: program.totalStudents,
        maleStudents: program.maleStudents,
        femaleStudents: program.femaleStudents,
        scholarshipStudents: program.scholarshipStudents,
        passPercentage: program.passPercentage,
        hasApprovalLetter: !!program.approvalLetterPath
      })) || [];

      // Financial summary for college
      const collegeFinancial = latestReport.financialStatus ? {
        annualBudget: latestReport.financialStatus.totalAnnualBudget,
        actualExpenditure: latestReport.financialStatus.totalActualExpenditure,
        revenueGenerated: latestReport.financialStatus.totalRevenueGenerated,
        utilizationRate: Math.round(budgetUtilization * 100) / 100
      } : null;

      return {
        collegeId: college.collegeId,
        collegeName: college.collegeName,
        totalReports: college.totalReports,
        totalStudents: latestReport.totalStudents,
        totalPrograms: latestReport.programs?.length || 0,
        programSummary,
        financialSummary: collegeFinancial,
        studentGrowth: Math.round(avgStudentGrowth * 100) / 100,
        lastSubmission: latestReport.submissionDate
      };
    });

    // Process yearly trends
    const yearlyTrends = Array.from(yearMap.values()).sort((a, b) => 
      a.year.localeCompare(b.year)
    );

    // Calculate overall metrics
    const totalStudents = reports.reduce((sum, report) => sum + report.totalStudents, 0);
    const averagePassRate = totalProgramCount > 0 ? totalPassRateSum / totalProgramCount : 0;
    const scholarshipPercentage = totalStudents > 0 
      ? (totalScholarshipStudents / totalStudents) * 100 
      : 0;

    return {
      totalColleges: collegeMap.size,
      totalReports: reports.length,
      totalStudents,
      totalMaleStudents,
      totalFemaleStudents,
      totalScholarshipStudents,
      scholarshipPercentage: Math.round(scholarshipPercentage * 100) / 100,
      financialSummary,
      averagePassRate: Math.round(averagePassRate * 100) / 100,
      programDistribution: programDistribution.sort((a, b) => b.totalStudents - a.totalStudents),
      collegePerformance: collegePerformance.sort((a, b) => b.totalStudents - a.totalStudents),
      yearlyTrends
    };
  }

  /**
   * Get summary statistics for a specific college
   * @param {string} collegeId - College ID
   * @returns {Promise<Object>} College summary
   */
  async getCollegeSummary(collegeId) {
    const reports = await this.getReportsByCollege(collegeId);
    
    if (reports.length === 0) {
      return null;
    }

    const latestReport = reports.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    )[0];

    const totalMale = latestReport.programs?.reduce((sum, p) => sum + (p.maleStudents || 0), 0) || 0;
    const totalFemale = latestReport.programs?.reduce((sum, p) => sum + (p.femaleStudents || 0), 0) || 0;
    const totalScholarship = latestReport.programs?.reduce((sum, p) => sum + (p.scholarshipStudents || 0), 0) || 0;

    // Financial data
    const financialData = latestReport.financialStatus ? {
      salaries: latestReport.financialStatus.salaries,
      capital: latestReport.financialStatus.capital,
      operational: latestReport.financialStatus.operational,
      research: latestReport.financialStatus.research,
      totalAnnualBudget: latestReport.financialStatus.totalAnnualBudget,
      totalActualExpenditure: latestReport.financialStatus.totalActualExpenditure,
      totalRevenueGenerated: latestReport.financialStatus.totalRevenueGenerated,
      utilizationRate: latestReport.financialStatus.totalAnnualBudget > 0 
        ? Math.round((latestReport.financialStatus.totalActualExpenditure / latestReport.financialStatus.totalAnnualBudget) * 100 * 100) / 100 
        : 0,
      attachments: latestReport.financialStatus.attachments
    } : null;

    return {
      collegeId: latestReport.collegeId,
      collegeName: latestReport.collegeName,
      totalReports: reports.length,
      latestAcademicYear: latestReport.academicYear,
      totalStudents: latestReport.totalStudents,
      maleStudents: totalMale,
      femaleStudents: totalFemale,
      scholarshipStudents: totalScholarship,
      totalPrograms: latestReport.programs?.length || 0,
      programs: latestReport.programs,
      infrastructure: {
        buildingStatus: latestReport.buildingStatus,
        classroomCount: latestReport.classroomCount,
        labCount: latestReport.labCount,
        libraryBooks: latestReport.libraryBooks
      },
      financial: financialData,
      actualProgress: latestReport.actualProgress || '',
      adminProgress: latestReport.adminProgress || '',
      majorChallenges: latestReport.majorChallenges || '',
      nextYearPlan: latestReport.nextYearPlan || ''
    };
  }

  /**
   * Get financial analytics across all colleges
   * @returns {Promise<Object>} Financial analytics
   */
  async getFinancialAnalytics() {
    const reports = await this.getAllReports();
    
    const financialData = reports.filter(report => report.financialStatus).map(report => ({
      collegeId: report.collegeId,
      collegeName: report.collegeName,
      academicYear: report.academicYear,
      financial: report.financialStatus
    }));

    if (financialData.length === 0) {
      return {
        totalAnnualBudget: 0,
        totalExpenditure: 0,
        totalRevenue: 0,
        averageUtilization: 0,
        topSpendingColleges: [],
        categoryAnalysis: {
          salaries: { budget: 0, expenditure: 0, percentage: 0 },
          capital: { budget: 0, expenditure: 0, percentage: 0 },
          operational: { budget: 0, expenditure: 0, percentage: 0 },
          research: { budget: 0, expenditure: 0, percentage: 0 }
        }
      };
    }

    // Calculate totals
    const totals = financialData.reduce((acc, data) => {
      const fs = data.financial;
      acc.totalBudget += fs.totalAnnualBudget || 0;
      acc.totalExpenditure += fs.totalActualExpenditure || 0;
      acc.totalRevenue += fs.totalRevenueGenerated || 0;
      
      ['salaries', 'capital', 'operational', 'research'].forEach(category => {
        if (fs[category]) {
          acc.categories[category].budget += fs[category].annualBudget || 0;
          acc.categories[category].expenditure += fs[category].actualExpenditure || 0;
        }
      });
      
      return acc;
    }, {
      totalBudget: 0,
      totalExpenditure: 0,
      totalRevenue: 0,
      categories: {
        salaries: { budget: 0, expenditure: 0 },
        capital: { budget: 0, expenditure: 0 },
        operational: { budget: 0, expenditure: 0 },
        research: { budget: 0, expenditure: 0 }
      }
    });

    // Calculate percentages
    const categoryAnalysis = {};
    Object.keys(totals.categories).forEach(category => {
      const cat = totals.categories[category];
      categoryAnalysis[category] = {
        budget: cat.budget,
        expenditure: cat.expenditure,
        percentage: totals.totalBudget > 0 ? Math.round((cat.budget / totals.totalBudget) * 100 * 100) / 100 : 0
      };
    });

    // Top spending colleges
    const topSpendingColleges = financialData
      .map(data => ({
        collegeName: data.collegeName,
        annualBudget: data.financial.totalAnnualBudget || 0,
        actualExpenditure: data.financial.totalActualExpenditure || 0,
        utilizationRate: data.financial.totalAnnualBudget > 0 
          ? Math.round((data.financial.totalActualExpenditure / data.financial.totalAnnualBudget) * 100 * 100) / 100 
          : 0
      }))
      .sort((a, b) => b.annualBudget - a.annualBudget)
      .slice(0, 10);

    return {
      totalAnnualBudget: totals.totalBudget,
      totalExpenditure: totals.totalExpenditure,
      totalRevenue: totals.totalRevenue,
      averageUtilization: totals.totalBudget > 0 
        ? Math.round((totals.totalExpenditure / totals.totalBudget) * 100 * 100) / 100 
        : 0,
      topSpendingColleges,
      categoryAnalysis
    };
  }
}

module.exports = new ProgressReport();