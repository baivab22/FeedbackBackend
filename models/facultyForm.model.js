const mongoose = require('mongoose');

const academicProgramSchema = new mongoose.Schema({
  level: {
    type: String,
    required: true,
    enum: ['Bachelor', 'Master', 'MPhil', 'PhD'],
    trim: true
  },
  programName: {
    type: String,
    required: true,
    trim: true
  },
  programType: {
    type: String,
    required: true,
    enum: ['Year-wise', 'Semester-wise', 'Trimester-wise'],
    trim: true
  },
  specializationAreas: [{
    type: String,
    trim: true
  }]
});

const studentEnrollmentSchema = new mongoose.Schema({
  program: {
    type: String,
    required: true,
    trim: true
  },
  level: {
    type: String,
    required: true,
    enum: ['Bachelor', 'Master', 'MPhil', 'PhD'],
    trim: true
  },
  // Constituent Campus - Exam Appeared
  constituentExamAppearedM: {
    type: Number,
    default: 0,
    min: 0
  },
  constituentExamAppearedF: {
    type: Number,
    default: 0,
    min: 0
  },
  constituentExamAppearedT: {
    type: Number,
    default: 0,
    min: 0
  },
  // Constituent Campus - Exam Passed
  constituentExamPassedM: {
    type: Number,
    default: 0,
    min: 0
  },
  constituentExamPassedF: {
    type: Number,
    default: 0,
    min: 0
  },
  constituentExamPassedT: {
    type: Number,
    default: 0,
    min: 0
  },
  // Affiliated Campus - Exam Appeared
  affiliatedExamAppearedM: {
    type: Number,
    default: 0,
    min: 0
  },
  affiliatedExamAppearedF: {
    type: Number,
    default: 0,
    min: 0
  },
  affiliatedExamAppearedT: {
    type: Number,
    default: 0,
    min: 0
  },
  // Affiliated Campus - Exam Passed
  affiliatedExamPassedM: {
    type: Number,
    default: 0,
    min: 0
  },
  affiliatedExamPassedF: {
    type: Number,
    default: 0,
    min: 0
  },
  affiliatedExamPassedT: {
    type: Number,
    default: 0,
    min: 0
  }
});

const graduateSchema = new mongoose.Schema({
  program: {
    type: String,
    required: true,
    trim: true
  },
  semester: {
    type: String,
    required: true,
    trim: true
  },
  // Constituent Campus - Exam Appeared
  constituentExamAppearedM: {
    type: Number,
    default: 0,
    min: 0
  },
  constituentExamAppearedF: {
    type: Number,
    default: 0,
    min: 0
  },
  constituentExamAppearedT: {
    type: Number,
    default: 0,
    min: 0
  },
  // Constituent Campus - Exam Passed
  constituentExamPassedM: {
    type: Number,
    default: 0,
    min: 0
  },
  constituentExamPassedF: {
    type: Number,
    default: 0,
    min: 0
  },
  constituentExamPassedT: {
    type: Number,
    default: 0,
    min: 0
  },
  // Affiliated Campus - Exam Appeared
  affiliatedExamAppearedM: {
    type: Number,
    default: 0,
    min: 0
  },
  affiliatedExamAppearedF: {
    type: Number,
    default: 0,
    min: 0
  },
  affiliatedExamAppearedT: {
    type: Number,
    default: 0,
    min: 0
  },
  // Affiliated Campus - Exam Passed
  affiliatedExamPassedM: {
    type: Number,
    default: 0,
    min: 0
  },
  affiliatedExamPassedF: {
    type: Number,
    default: 0,
    min: 0
  },
  affiliatedExamPassedT: {
    type: Number,
    default: 0,
    min: 0
  }
});

const collaborationSchema = new mongoose.Schema({
  institutionName: {
    type: String,
    required: true,
    trim: true
  },
  objective: {
    type: String,
    required: true,
    trim: true
  }
});

const facultyFormSchema = new mongoose.Schema({
  // Section 1: General Information
  instituteName: {
    type: String,
    required: true,
    trim: true
  },
  reportingPeriod: {
    type: String,
    required: true,
    trim: true
  },
  headName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  submissionDate: {
    type: Date,
    required: true
  },

  // Section 2: Academic Programs
  academicPrograms: [academicProgramSchema],
  newPrograms: [{
    type: String,
    trim: true
  }],
  studentEnrollment: [studentEnrollmentSchema],
  graduates: [graduateSchema],
  curriculumUpdates: {
    type: String,
    trim: true
  },
  teachingInnovations: {
    type: String,
    trim: true
  },
  digitalTools: {
    type: String,
    trim: true
  },
  studentFeedback: {
    type: String,
    trim: true
  },
  academicChallenges: {
    type: String,
    trim: true
  },

  // Section 3: Research and Innovation
  researchProjectsInitiated: {
    type: Number,
    default: 0,
    min: 0
  },
  researchProjectsCompleted: {
    type: Number,
    default: 0,
    min: 0
  },
  researchFunding: {
    type: String,
    trim: true
  },
  publications: {
    type: String,
    trim: true
  },
  patents: {
    type: String,
    trim: true
  },
  conferences: {
    type: String,
    trim: true
  },
  facultyParticipation: {
    type: String,
    trim: true
  },
  studentResearch: {
    type: String,
    trim: true
  },
  collaborations: [collaborationSchema],

  // Section 4: Human Resources
  academicStaff: {
    type: String,
    trim: true
  },
  adminStaff: {
    type: String,
    trim: true
  },
  newRecruitments: {
    type: String,
    trim: true
  },
  trainings: {
    type: String,
    trim: true
  },
  promotions: {
    type: String,
    trim: true
  },
  retirements: {
    type: String,
    trim: true
  },
  developmentNeeds: {
    type: String,
    trim: true
  },

  // Section 5: Infrastructure and Facilities
  infrastructureAdditions: {
    type: String,
    trim: true
  },
  newFacilities: {
    type: String,
    trim: true
  },
  constructionStatus: {
    type: String,
    trim: true
  },
  equipmentProcured: {
    type: String,
    trim: true
  },
  infrastructureChallenges: {
    type: String,
    trim: true
  },
  accessibilityMeasures: {
    type: String,
    trim: true
  },

  // Section 6: Financial Status
  budgetAllocated: {
    type: String,
    trim: true
  },
  actualExpenditure: {
    type: String,
    trim: true
  },
  revenueGenerated: {
    type: String,
    trim: true
  },
  financialChallenges: {
    type: String,
    trim: true
  },
  auditStatus: {
    type: String,
    trim: true
  },

  // Section 7: Governance and Management
  meetingsHeld: {
    type: String,
    trim: true
  },
  keyDecisions: {
    type: String,
    trim: true
  },
  policyUpdates: {
    type: String,
    trim: true
  },
  grievanceHandling: {
    type: String,
    trim: true
  },
  transparencyInitiatives: {
    type: String,
    trim: true
  },

  // Section 8: Student Affairs and Support Services
  scholarships: {
    type: String,
    trim: true
  },
  careerCounseling: {
    type: String,
    trim: true
  },
  extracurricular: {
    type: String,
    trim: true
  },
  alumniEngagement: {
    type: String,
    trim: true
  },
  studentAchievements: {
    type: String,
    trim: true
  },

  // Section 9: Community Engagement and Extension Activities
  outreachPrograms: {
    type: String,
    trim: true
  },
  communityCollaborations: {
    type: String,
    trim: true
  },
  socialResponsibility: {
    type: String,
    trim: true
  },
  continuingEducation: {
    type: String,
    trim: true
  },

  // Section 10: Achievements and Recognition
  awards: {
    type: String,
    trim: true
  },
  successStories: {
    type: String,
    trim: true
  },
  reputationContributions: {
    type: String,
    trim: true
  },

  // Section 11: Challenges and Lessons Learned
  keyChallenges: {
    type: String,
    trim: true
  },
  strategies: {
    type: String,
    trim: true
  },
  lessonsLearned: {
    type: String,
    trim: true
  },

  // Section 12: Future Plans and Recommendations
  majorGoals: {
    type: String,
    trim: true
  },
  proposedProjects: {
    type: String,
    trim: true
  },
  supportNeeded: {
    type: String,
    trim: true
  },
  policyReforms: {
    type: String,
    trim: true
  },

  // Metadata
  status: {
    type: String,
    enum: ['draft', 'submitted', 'reviewed', 'approved'],
    default: 'submitted'
  },
  reviewedBy: {
    type: String,
    trim: true
  },
  reviewDate: {
    type: Date
  },
  reviewComments: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
facultyFormSchema.index({ instituteName: 1 });
facultyFormSchema.index({ reportingPeriod: 1 });
facultyFormSchema.index({ headName: 1 });
facultyFormSchema.index({ email: 1 });
facultyFormSchema.index({ status: 1 });
facultyFormSchema.index({ createdAt: -1 });

// Virtual fields for calculated values
facultyFormSchema.virtual('totalStudents').get(function() {
  return this.studentEnrollment.reduce((total, enrollment) => {
    return total + (enrollment.constituentExamAppearedT || 0) + (enrollment.affiliatedExamAppearedT || 0);
  }, 0);
});

facultyFormSchema.virtual('totalGraduates').get(function() {
  return this.graduates.reduce((total, graduate) => {
    return total + (graduate.constituentExamPassedT || 0) + (graduate.affiliatedExamPassedT || 0);
  }, 0);
});

facultyFormSchema.virtual('totalResearchProjects').get(function() {
  return (this.researchProjectsInitiated || 0) + (this.researchProjectsCompleted || 0);
});

facultyFormSchema.virtual('passRate').get(function() {
  const totalAppeared = this.studentEnrollment.reduce((total, enrollment) => {
    return total + (enrollment.constituentExamAppearedT || 0) + (enrollment.affiliatedExamAppearedT || 0);
  }, 0);
  
  const totalPassed = this.studentEnrollment.reduce((total, enrollment) => {
    return total + (enrollment.constituentExamPassedT || 0) + (enrollment.affiliatedExamPassedT || 0);
  }, 0);
  
  return totalAppeared > 0 ? Math.round((totalPassed / totalAppeared) * 100) : 0;
});

// Pre-save middleware to update calculated totals
facultyFormSchema.pre('save', function(next) {
  // Calculate totals for student enrollment
  this.studentEnrollment.forEach(enrollment => {
    enrollment.constituentExamAppearedT = (enrollment.constituentExamAppearedM || 0) + (enrollment.constituentExamAppearedF || 0);
    enrollment.constituentExamPassedT = (enrollment.constituentExamPassedM || 0) + (enrollment.constituentExamPassedF || 0);
    enrollment.affiliatedExamAppearedT = (enrollment.affiliatedExamAppearedM || 0) + (enrollment.affiliatedExamAppearedF || 0);
    enrollment.affiliatedExamPassedT = (enrollment.affiliatedExamPassedM || 0) + (enrollment.affiliatedExamPassedF || 0);
  });
  
  // Calculate totals for graduates
  this.graduates.forEach(graduate => {
    graduate.constituentExamAppearedT = (graduate.constituentExamAppearedM || 0) + (graduate.constituentExamAppearedF || 0);
    graduate.constituentExamPassedT = (graduate.constituentExamPassedM || 0) + (graduate.constituentExamPassedF || 0);
    graduate.affiliatedExamAppearedT = (graduate.affiliatedExamAppearedM || 0) + (graduate.affiliatedExamAppearedF || 0);
    graduate.affiliatedExamPassedT = (graduate.affiliatedExamPassedM || 0) + (graduate.affiliatedExamPassedF || 0);
  });
  
  next();
});

// Static methods
facultyFormSchema.statics.findByReportingPeriod = function(period) {
  return this.find({ reportingPeriod: period });
};

facultyFormSchema.statics.findByStatus = function(status) {
  return this.find({ status: status });
};

facultyFormSchema.statics.getAnalytics = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalFaculties: { $sum: 1 },
        totalStudents: { $sum: '$totalStudents' },
        totalGraduates: { $sum: '$totalGraduates' },
        totalResearchProjects: { $sum: '$totalResearchProjects' },
        averagePassRate: { $avg: '$passRate' }
      }
    }
  ]);
};

// Instance methods
facultyFormSchema.methods.approve = function(reviewerId, comments) {
  this.status = 'approved';
  this.reviewedBy = reviewerId;
  this.reviewDate = new Date();
  this.reviewComments = comments;
  return this.save();
};

facultyFormSchema.methods.reject = function(reviewerId, comments) {
  this.status = 'reviewed';
  this.reviewedBy = reviewerId;
  this.reviewDate = new Date();
  this.reviewComments = comments;
  return this.save();
};

const FacultyForm = mongoose.model('FacultyForm', facultyFormSchema);

module.exports = FacultyForm;