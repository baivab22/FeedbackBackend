const mongoose = require('mongoose');

const programSchema = new mongoose.Schema(
  {
    institution: { type: String, trim: true, default: '' },
    level: { type: String, trim: true, default: '' },
    programName: { type: String, trim: true, required: true },
    totalStudents: { type: Number, default: 0, min: 0 },
    maleStudents: { type: Number, default: 0, min: 0 },
    femaleStudents: { type: Number, default: 0, min: 0 },
    scholarshipStudents: { type: Number, default: 0, min: 0 },
    isScholarshipRuleApplied: { type: Boolean, default: false },
    newAdmissions: { type: Number, default: 0, min: 0 },
    graduatedStudents: { type: Number, default: 0, min: 0 },
    passPercentage: { type: Number, default: 0, min: 0, max: 100 },
    approvalLetterPath: { type: String, default: null },
    approvalLetterFilename: { type: String, default: null },
    cloudinaryPublicId: { type: String, default: null },
  },
  { _id: false }
);

const financialItemSchema = new mongoose.Schema(
  {
    annualBudget: { type: Number, default: 0, min: 0 },
    actualExpenditure: { type: Number, default: 0, min: 0 },
    revenueGenerated: { type: Number, default: 0, min: 0 },
    sources: { type: [String], default: [] },
  },
  { _id: false }
);

const financialAttachmentsSchema = new mongoose.Schema(
  {
    auditedFinancialStatements: { type: String, default: null },
    auditedFinancialStatementsFilename: { type: String, default: null },
    budgetCopy: { type: String, default: null },
    budgetCopyFilename: { type: String, default: null },
  },
  { _id: false }
);

const financialStatusSchema = new mongoose.Schema(
  {
    salaries: { type: financialItemSchema, default: () => ({}) },
    capital: { type: financialItemSchema, default: () => ({}) },
    operational: { type: financialItemSchema, default: () => ({}) },
    research: { type: financialItemSchema, default: () => ({}) },
    attachments: { type: financialAttachmentsSchema, default: () => ({}) },
    totalAnnualBudget: { type: Number, default: 0, min: 0 },
    totalActualExpenditure: { type: Number, default: 0, min: 0 },
    totalRevenueGenerated: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const progressReportSchema = new mongoose.Schema(
  {
    legacyId: { type: String, index: true, sparse: true },
    collegeId: { type: String, required: true, trim: true, index: true },
    collegeName: { type: String, required: true, trim: true, index: true },
    academicYear: { type: String, required: true, trim: true, index: true },
    programs: { type: [programSchema], default: [] },
    totalStudents: { type: Number, default: 0, min: 0 },
    financialStatus: { type: financialStatusSchema, default: () => ({}) },
    buildingStatus: { type: String, default: '' },
    classroomCount: { type: Number, default: 0, min: 0 },
    labCount: { type: Number, default: 0, min: 0 },
    libraryBooks: { type: Number, default: 0, min: 0 },
    actualProgress: { type: String, default: '' },
    adminProgress: { type: String, default: '' },
    majorChallenges: { type: String, default: '' },
    nextYearPlan: { type: String, default: '' },
    submissionDate: { type: Date, default: Date.now },

    // Existing analytics endpoint reads these fields.
    totalAllocatedBudget: { type: Number, default: 0, min: 0 },
    totalSpentBudget: { type: Number, default: 0, min: 0 },
    studentCount: { type: Number, default: 0, min: 0 },
    facultyDevelopment: {
      trainingAttended: { type: Number, default: 0, min: 0 },
      researchInvolved: { type: Number, default: 0, min: 0 },
    },
  },
  {
    timestamps: true,
    strict: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

progressReportSchema.pre('validate', function preValidate(next) {
  if (Array.isArray(this.programs)) {
    this.totalStudents = this.programs.reduce((sum, p) => sum + (Number(p.totalStudents) || 0), 0);
  }

  const fs = this.financialStatus || {};
  const categories = ['salaries', 'capital', 'operational', 'research'];
  this.financialStatus = this.financialStatus || {};

  this.financialStatus.totalAnnualBudget = categories.reduce(
    (sum, category) => sum + (Number(fs?.[category]?.annualBudget) || 0),
    0
  );

  this.financialStatus.totalActualExpenditure = categories.reduce(
    (sum, category) => sum + (Number(fs?.[category]?.actualExpenditure) || 0),
    0
  );

  this.financialStatus.totalRevenueGenerated = categories.reduce(
    (sum, category) => sum + (Number(fs?.[category]?.revenueGenerated) || 0),
    0
  );

  next();
});

progressReportSchema.index({ collegeId: 1, academicYear: 1 });
progressReportSchema.index({ submissionDate: -1 });

function normalizeProgram(program = {}) {
  return {
    institution: program.institution || '',
    level: program.level || '',
    programName: program.programName || '',
    totalStudents: Number(program.totalStudents) || 0,
    maleStudents: Number(program.maleStudents) || 0,
    femaleStudents: Number(program.femaleStudents) || 0,
    scholarshipStudents: Number(program.scholarshipStudents) || 0,
    isScholarshipRuleApplied: Boolean(program.isScholarshipRuleApplied),
    newAdmissions: Number(program.newAdmissions) || 0,
    graduatedStudents: Number(program.graduatedStudents) || 0,
    passPercentage: Number(program.passPercentage) || 0,
    approvalLetterPath: program.approvalLetterPath || null,
    approvalLetterFilename: program.approvalLetterFilename || null,
    cloudinaryPublicId: program.cloudinaryPublicId || null,
  };
}

function normalizeFinancialData(financialData = {}) {
  const defaultFinancial = {
    salaries: { annualBudget: 0, actualExpenditure: 0, revenueGenerated: 0, sources: [] },
    capital: { annualBudget: 0, actualExpenditure: 0, revenueGenerated: 0, sources: [] },
    operational: { annualBudget: 0, actualExpenditure: 0, revenueGenerated: 0, sources: [] },
    research: { annualBudget: 0, actualExpenditure: 0, revenueGenerated: 0, sources: [] },
    attachments: {
      auditedFinancialStatements: null,
      auditedFinancialStatementsFilename: null,
      budgetCopy: null,
      budgetCopyFilename: null,
    },
  };

  const processed = {
    salaries: { ...defaultFinancial.salaries, ...financialData.salaries },
    capital: { ...defaultFinancial.capital, ...financialData.capital },
    operational: { ...defaultFinancial.operational, ...financialData.operational },
    research: { ...defaultFinancial.research, ...financialData.research },
    attachments: { ...defaultFinancial.attachments, ...financialData.attachments },
  };

  processed.totalAnnualBudget =
    (Number(processed.salaries.annualBudget) || 0) +
    (Number(processed.capital.annualBudget) || 0) +
    (Number(processed.operational.annualBudget) || 0) +
    (Number(processed.research.annualBudget) || 0);

  processed.totalActualExpenditure =
    (Number(processed.salaries.actualExpenditure) || 0) +
    (Number(processed.capital.actualExpenditure) || 0) +
    (Number(processed.operational.actualExpenditure) || 0) +
    (Number(processed.research.actualExpenditure) || 0);

  processed.totalRevenueGenerated =
    (Number(processed.salaries.revenueGenerated) || 0) +
    (Number(processed.capital.revenueGenerated) || 0) +
    (Number(processed.operational.revenueGenerated) || 0) +
    (Number(processed.research.revenueGenerated) || 0);

  return processed;
}

function safeRegex(value) {
  return new RegExp(String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

progressReportSchema.statics.getAllReports = function getAllReports() {
  return this.find().sort({ submissionDate: -1 });
};

progressReportSchema.statics.getReportById = function getReportById(id) {
  return this.findById(id);
};

progressReportSchema.statics.getReportsByCollege = function getReportsByCollege(collegeId) {
  return this.find({ collegeId });
};

progressReportSchema.statics.getReportsByAcademicYear = function getReportsByAcademicYear(academicYear) {
  return this.find({ academicYear });
};

progressReportSchema.statics.getReportsByProgram = function getReportsByProgram(programName) {
  return this.find({ 'programs.programName': safeRegex(programName) });
};

progressReportSchema.statics.getReportsByInstitution = function getReportsByInstitution(institution) {
  return this.find({ 'programs.institution': safeRegex(institution) });
};

progressReportSchema.statics.getReportsByLevel = function getReportsByLevel(level) {
  return this.find({ 'programs.level': safeRegex(level) });
};

progressReportSchema.statics.createReport = async function createReport(reportData) {
  const programs = Array.isArray(reportData.programs) ? reportData.programs.map(normalizeProgram) : [];
  const financialStatus = normalizeFinancialData(reportData.financialStatus || {});

  return this.create({
    ...reportData,
    programs,
    totalStudents: programs.reduce((sum, program) => sum + (program.totalStudents || 0), 0),
    financialStatus,
  });
};

progressReportSchema.statics.updateReport = async function updateReport(id, updateData) {
  const payload = { ...updateData };

  if (payload.programs) {
    payload.programs = payload.programs.map(normalizeProgram);
    payload.totalStudents = payload.programs.reduce((sum, program) => sum + (program.totalStudents || 0), 0);
  }

  if (payload.financialStatus) {
    payload.financialStatus = normalizeFinancialData(payload.financialStatus);
  }

  return this.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
};

progressReportSchema.statics.updateProgram = async function updateProgram(reportId, institution, level, programName, programData) {
  const report = await this.findById(reportId);
  if (!report) throw new Error('Report not found');

  const index = (report.programs || []).findIndex(
    (program) =>
      program.institution === institution &&
      program.level === level &&
      program.programName === programName
  );

  if (index === -1) throw new Error('Program not found in report');

  report.programs[index] = normalizeProgram({ ...report.programs[index].toObject?.() ?? report.programs[index], ...programData });
  report.totalStudents = report.programs.reduce((sum, program) => sum + (Number(program.totalStudents) || 0), 0);
  return report.save();
};

progressReportSchema.statics.addProgram = async function addProgram(reportId, programData) {
  const report = await this.findById(reportId);
  if (!report) throw new Error('Report not found');

  const existingProgram = (report.programs || []).find(
    (program) =>
      program.institution === programData.institution &&
      program.level === programData.level &&
      program.programName === programData.programName
  );

  if (existingProgram) throw new Error('Program already exists in this report');

  report.programs.push(normalizeProgram(programData));
  report.totalStudents = report.programs.reduce((sum, program) => sum + (Number(program.totalStudents) || 0), 0);
  return report.save();
};

progressReportSchema.statics.removeProgram = async function removeProgram(reportId, institution, level, programName) {
  const report = await this.findById(reportId);
  if (!report) throw new Error('Report not found');

  const filtered = (report.programs || []).filter(
    (program) =>
      !(program.institution === institution && program.level === level && program.programName === programName)
  );

  if (filtered.length === report.programs.length) throw new Error('Program not found in report');

  report.programs = filtered;
  report.totalStudents = report.programs.reduce((sum, program) => sum + (Number(program.totalStudents) || 0), 0);
  return report.save();
};

progressReportSchema.statics.updateFinancialStatus = async function updateFinancialStatus(reportId, category, financialData) {
  const report = await this.findById(reportId);
  if (!report) throw new Error('Report not found');

  const validCategories = ['salaries', 'capital', 'operational', 'research'];
  if (!validCategories.includes(category)) throw new Error('Invalid financial category');

  report.financialStatus = report.financialStatus || {};
  report.financialStatus[category] = {
    ...(report.financialStatus[category]?.toObject?.() ?? report.financialStatus[category] ?? {}),
    ...financialData,
  };
  report.financialStatus = normalizeFinancialData(report.financialStatus);
  return report.save();
};

progressReportSchema.statics.updateFinancialAttachments = async function updateFinancialAttachments(reportId, attachments) {
  const report = await this.findById(reportId);
  if (!report) throw new Error('Report not found');

  report.financialStatus = report.financialStatus || {};
  report.financialStatus.attachments = {
    ...(report.financialStatus.attachments?.toObject?.() ?? report.financialStatus.attachments ?? {}),
    ...attachments,
  };
  report.financialStatus = normalizeFinancialData(report.financialStatus);
  return report.save();
};

progressReportSchema.statics.deleteReport = function deleteReport(id) {
  return this.findByIdAndDelete(id);
};

progressReportSchema.statics.getFinancialAnalytics = async function getFinancialAnalytics() {
  const reports = await this.getAllReports();
  const financialData = reports.filter((report) => report.financialStatus).map((report) => ({
    collegeId: report.collegeId,
    collegeName: report.collegeName,
    academicYear: report.academicYear,
    financial: report.financialStatus,
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
        research: { budget: 0, expenditure: 0, percentage: 0 },
      },
    };
  }

  const totals = financialData.reduce(
    (acc, data) => {
      const fs = data.financial;
      acc.totalBudget += fs.totalAnnualBudget || 0;
      acc.totalExpenditure += fs.totalActualExpenditure || 0;
      acc.totalRevenue += fs.totalRevenueGenerated || 0;

      ['salaries', 'capital', 'operational', 'research'].forEach((category) => {
        if (fs[category]) {
          acc.categories[category].budget += fs[category].annualBudget || 0;
          acc.categories[category].expenditure += fs[category].actualExpenditure || 0;
        }
      });

      return acc;
    },
    {
      totalBudget: 0,
      totalExpenditure: 0,
      totalRevenue: 0,
      categories: {
        salaries: { budget: 0, expenditure: 0 },
        capital: { budget: 0, expenditure: 0 },
        operational: { budget: 0, expenditure: 0 },
        research: { budget: 0, expenditure: 0 },
      },
    }
  );

  const categoryAnalysis = {};
  Object.keys(totals.categories).forEach((category) => {
    const cat = totals.categories[category];
    categoryAnalysis[category] = {
      budget: cat.budget,
      expenditure: cat.expenditure,
      percentage: totals.totalBudget > 0 ? Math.round((cat.budget / totals.totalBudget) * 100 * 100) / 100 : 0,
    };
  });

  const topSpendingColleges = financialData
    .map((data) => ({
      collegeName: data.collegeName,
      annualBudget: data.financial.totalAnnualBudget || 0,
      actualExpenditure: data.financial.totalActualExpenditure || 0,
      utilizationRate:
        data.financial.totalAnnualBudget > 0
          ? Math.round((data.financial.totalActualExpenditure / data.financial.totalAnnualBudget) * 100 * 100) / 100
          : 0,
    }))
    .sort((a, b) => b.annualBudget - a.annualBudget)
    .slice(0, 10);

  return {
    totalAnnualBudget: totals.totalBudget,
    totalExpenditure: totals.totalExpenditure,
    totalRevenue: totals.totalRevenue,
    averageUtilization:
      totals.totalBudget > 0 ? Math.round((totals.totalExpenditure / totals.totalBudget) * 100 * 100) / 100 : 0,
    topSpendingColleges,
    categoryAnalysis,
  };
};

progressReportSchema.statics.searchPrograms = async function searchPrograms(criteria = {}) {
  const reports = await this.getAllReports();
  const results = [];

  reports.forEach((report) => {
    report.programs?.forEach((program) => {
      let matches = true;

      if (criteria.institution && program.institution) {
        matches = matches && program.institution.toLowerCase().includes(String(criteria.institution).toLowerCase());
      }

      if (criteria.level && program.level) {
        matches = matches && program.level.toLowerCase() === String(criteria.level).toLowerCase();
      }

      if (criteria.programName && program.programName) {
        matches = matches && program.programName.toLowerCase().includes(String(criteria.programName).toLowerCase());
      }

      if (criteria.minStudents && program.totalStudents) {
        matches = matches && program.totalStudents >= Number(criteria.minStudents);
      }

      if (criteria.minPassPercentage && program.passPercentage) {
        matches = matches && program.passPercentage >= Number(criteria.minPassPercentage);
      }

      if (matches) {
        results.push({
          ...program.toObject?.() ?? program,
          collegeId: report.collegeId,
          collegeName: report.collegeName,
          academicYear: report.academicYear,
          reportId: report.id,
        });
      }
    });
  });

  return results;
};

progressReportSchema.statics.getAnalytics = async function getAnalytics() {
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
          research: { budget: 0, expenditure: 0, revenue: 0 },
        },
      },
      averagePassRate: 0,
      programDistribution: [],
      institutionDistribution: [],
      levelDistribution: [],
      collegePerformance: [],
      yearlyTrends: [],
    };
  }

  const collegeMap = new Map();
  const programStats = new Map();
  const institutionStats = new Map();
  const levelStats = new Map();
  const yearMap = new Map();

  let totalMaleStudents = 0;
  let totalFemaleStudents = 0;
  let totalScholarshipStudents = 0;
  let totalPassRateSum = 0;
  let totalProgramCount = 0;

  const financialSummary = {
    totalAnnualBudget: 0,
    totalActualExpenditure: 0,
    totalRevenueGenerated: 0,
    categoryBreakdown: {
      salaries: { budget: 0, expenditure: 0, revenue: 0 },
      capital: { budget: 0, expenditure: 0, revenue: 0 },
      operational: { budget: 0, expenditure: 0, revenue: 0 },
      research: { budget: 0, expenditure: 0, revenue: 0 },
    },
  };

  reports.forEach((report) => {
    if (!collegeMap.has(report.collegeId)) {
      collegeMap.set(report.collegeId, {
        collegeId: report.collegeId,
        collegeName: report.collegeName,
        reports: [],
        totalReports: 0,
      });
    }
    collegeMap.get(report.collegeId).reports.push(report);
    collegeMap.get(report.collegeId).totalReports++;

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
          totalRevenueGenerated: 0,
        },
        reportCount: 0,
      });
    }
    const yearData = yearMap.get(report.academicYear);
    yearData.reportCount++;

    if (report.financialStatus) {
      const fs = report.financialStatus;
      financialSummary.totalAnnualBudget += fs.totalAnnualBudget || 0;
      financialSummary.totalActualExpenditure += fs.totalActualExpenditure || 0;
      financialSummary.totalRevenueGenerated += fs.totalRevenueGenerated || 0;

      yearData.financial.totalAnnualBudget += fs.totalAnnualBudget || 0;
      yearData.financial.totalActualExpenditure += fs.totalActualExpenditure || 0;
      yearData.financial.totalRevenueGenerated += fs.totalRevenueGenerated || 0;

      ['salaries', 'capital', 'operational', 'research'].forEach((category) => {
        if (fs[category]) {
          financialSummary.categoryBreakdown[category].budget += fs[category].annualBudget || 0;
          financialSummary.categoryBreakdown[category].expenditure += fs[category].actualExpenditure || 0;
          financialSummary.categoryBreakdown[category].revenue += fs[category].revenueGenerated || 0;
        }
      });
    }

    report.programs?.forEach((program) => {
      const male = program.maleStudents || 0;
      const female = program.femaleStudents || 0;
      const scholarship = program.scholarshipStudents || 0;
      const institution = program.institution || 'Unknown Institution';
      const level = program.level || 'Not '; 

      totalMaleStudents += male;
      totalFemaleStudents += female;
      totalScholarshipStudents += scholarship;
      totalPassRateSum += program.passPercentage || 0;
      totalProgramCount++;

      yearData.totalStudents += program.totalStudents || 0;
      yearData.totalMale += male;
      yearData.totalFemale += female;
      yearData.totalScholarship += scholarship;

      const programKey = `${institution}|${level}|${program.programName}`;
      if (!programStats.has(programKey)) {
        programStats.set(programKey, {
          institution,
          level,
          programName: program.programName,
          totalStudents: 0,
          maleStudents: 0,
          femaleStudents: 0,
          scholarshipStudents: 0,
          newAdmissions: 0,
          graduatedStudents: 0,
          totalPassRate: 0,
          programCount: 0,
          colleges: new Set(),
        });
      }

      const stats = programStats.get(programKey);
      stats.totalStudents += program.totalStudents || 0;
      stats.maleStudents += male;
      stats.femaleStudents += female;
      stats.scholarshipStudents += scholarship;
      stats.newAdmissions += program.newAdmissions || 0;
      stats.graduatedStudents += program.graduatedStudents || 0;
      stats.totalPassRate += program.passPercentage || 0;
      stats.programCount++;
      stats.colleges.add(report.collegeId);

      if (!institutionStats.has(institution)) {
        institutionStats.set(institution, {
          institutionName: institution,
          totalStudents: 0,
          totalPrograms: 0,
          totalColleges: new Set(),
          levels: new Set(),
        });
      }
      const instStats = institutionStats.get(institution);
      instStats.totalStudents += program.totalStudents || 0;
      instStats.totalPrograms++;
      instStats.totalColleges.add(report.collegeId);
      instStats.levels.add(level);

      if (!levelStats.has(level)) {
        levelStats.set(level, {
          levelName: level,
          totalStudents: 0,
          totalPrograms: 0,
          totalColleges: new Set(),
          institutions: new Set(),
        });
      }
      const lvlStats = levelStats.get(level);
      lvlStats.totalStudents += program.totalStudents || 0;
      lvlStats.totalPrograms++;
      lvlStats.totalColleges.add(report.collegeId);
      lvlStats.institutions.add(institution);
    });
  });

  financialSummary.budgetUtilization = financialSummary.totalAnnualBudget > 0
    ? Math.round((financialSummary.totalActualExpenditure / financialSummary.totalAnnualBudget) * 100 * 100) / 100
    : 0;

  const programDistribution = Array.from(programStats.values()).map((stats) => ({
    institution: stats.institution,
    level: stats.level,
    programName: stats.programName,
    totalStudents: stats.totalStudents,
    maleStudents: stats.maleStudents,
    femaleStudents: stats.femaleStudents,
    scholarshipStudents: stats.scholarshipStudents,
    scholarshipPercentage: stats.totalStudents > 0 ? Math.round((stats.scholarshipStudents / stats.totalStudents) * 100 * 100) / 100 : 0,
    newAdmissions: stats.newAdmissions,
    graduatedStudents: stats.graduatedStudents,
    averagePassRate: stats.programCount > 0 ? Math.round((stats.totalPassRate / stats.programCount) * 100) / 100 : 0,
    collegeCount: stats.colleges.size,
  }));

  const institutionDistribution = Array.from(institutionStats.values()).map((stats) => ({
    institutionName: stats.institutionName,
    totalStudents: stats.totalStudents,
    totalPrograms: stats.totalPrograms,
    collegeCount: stats.totalColleges.size,
    levelCount: stats.levels.size,
    averageStudentsPerProgram: stats.totalPrograms > 0 ? Math.round(stats.totalStudents / stats.totalPrograms) : 0,
  }));

  const levelDistribution = Array.from(levelStats.values()).map((stats) => ({
    levelName: stats.levelName,
    totalStudents: stats.totalStudents,
    totalPrograms: stats.totalPrograms,
    collegeCount: stats.totalColleges.size,
    institutionCount: stats.institutions.size,
    averageStudentsPerProgram: stats.totalPrograms > 0 ? Math.round(stats.totalStudents / stats.totalPrograms) : 0,
  }));

  const collegePerformance = Array.from(collegeMap.values()).map((college) => {
    const latestReport = college.reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

    const budgetUtilization = latestReport.financialStatus?.totalAnnualBudget > 0
      ? (latestReport.financialStatus.totalActualExpenditure / latestReport.financialStatus.totalAnnualBudget) * 100
      : 0;

    let avgStudentGrowth = 0;
    if (college.reports.length > 1) {
      const sortedReports = college.reports.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const oldestReport = sortedReports[0];
      if (oldestReport.totalStudents > 0) {
        avgStudentGrowth = ((latestReport.totalStudents - oldestReport.totalStudents) / oldestReport.totalStudents) * 100;
      }
    }

    const programSummary = latestReport.programs?.map((program) => ({
      institution: program.institution,
      level: program.level,
      programName: program.programName,
      totalStudents: program.totalStudents,
      maleStudents: program.maleStudents,
      femaleStudents: program.femaleStudents,
      scholarshipStudents: program.scholarshipStudents,
      passPercentage: program.passPercentage,
      hasApprovalLetter: !!program.approvalLetterPath,
    })) || [];

    const collegeFinancial = latestReport.financialStatus ? {
      annualBudget: latestReport.financialStatus.totalAnnualBudget,
      actualExpenditure: latestReport.financialStatus.totalActualExpenditure,
      revenueGenerated: latestReport.financialStatus.totalRevenueGenerated,
      utilizationRate: Math.round(budgetUtilization * 100) / 100,
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
      lastSubmission: latestReport.submissionDate,
    };
  });

  const yearlyTrends = Array.from(yearMap.values()).sort((a, b) => a.year.localeCompare(b.year));
  const totalStudents = reports.reduce((sum, report) => sum + (report.totalStudents || 0), 0);
  const averagePassRate = totalProgramCount > 0 ? totalPassRateSum / totalProgramCount : 0;
  const scholarshipPercentage = totalStudents > 0 ? (totalScholarshipStudents / totalStudents) * 100 : 0;

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
    institutionDistribution: institutionDistribution.sort((a, b) => b.totalStudents - a.totalStudents),
    levelDistribution: levelDistribution.sort((a, b) => b.totalStudents - a.totalStudents),
    collegePerformance: collegePerformance.sort((a, b) => b.totalStudents - a.totalStudents),
    yearlyTrends,
  };
};

progressReportSchema.statics.getCollegeSummary = async function getCollegeSummary(collegeId) {
  const reports = await this.getReportsByCollege(collegeId);

  if (reports.length === 0) return null;

  const latestReport = reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  const totalMale = latestReport.programs?.reduce((sum, p) => sum + (p.maleStudents || 0), 0) || 0;
  const totalFemale = latestReport.programs?.reduce((sum, p) => sum + (p.femaleStudents || 0), 0) || 0;
  const totalScholarship = latestReport.programs?.reduce((sum, p) => sum + (p.scholarshipStudents || 0), 0) || 0;

  const programsByInstitution = {};
  const programsByLevel = {};

  latestReport.programs?.forEach((program) => {
    const institution = program.institution || 'Unknown Institution';
    const level = program.level || 'Not Specifiedl';

    if (!programsByInstitution[institution]) {
      programsByInstitution[institution] = { institution, totalPrograms: 0, totalStudents: 0, levels: new Set() };
    }
    programsByInstitution[institution].totalPrograms++;
    programsByInstitution[institution].totalStudents += program.totalStudents || 0;
    programsByInstitution[institution].levels.add(level);

    if (!programsByLevel[level]) {
      programsByLevel[level] = { level, totalPrograms: 0, totalStudents: 0, institutions: new Set() };
    }
    programsByLevel[level].totalPrograms++;
    programsByLevel[level].totalStudents += program.totalStudents || 0;
    programsByLevel[level].institutions.add(institution);
  });

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
    attachments: latestReport.financialStatus.attachments,
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
    programsByInstitution: Object.values(programsByInstitution),
    programsByLevel: Object.values(programsByLevel),
    infrastructure: {
      buildingStatus: latestReport.buildingStatus,
      classroomCount: latestReport.classroomCount,
      labCount: latestReport.labCount,
      libraryBooks: latestReport.libraryBooks,
    },
    financial: financialData,
    actualProgress: latestReport.actualProgress || '',
    adminProgress: latestReport.adminProgress || '',
    majorChallenges: latestReport.majorChallenges || '',
    nextYearPlan: latestReport.nextYearPlan || '',
  };
};

module.exports = mongoose.models.ProgressReport || mongoose.model('ProgressReport', progressReportSchema);
