const mongoose = require('mongoose');

const collegeFormSchema = new mongoose.Schema({
  // Section 1: General College Information
  collegeName: {
    type: String,
    required: true,
    trim: true
  },
  campusType: {
    type: String,
    enum: ['Constituent Campus', 'Affiliated College', 'Community Campus', 'Private College'],
    required: true
  },
  establishmentDate: {
    type: Date,
    required: true
  },
  collegeId: {
    type: String,
    trim: true
  },
  principalInfo: {
    name: { type: String, required: true },
    contactNumber: { type: String },
    email: { type: String }
  },
  contactInfo: {
    officialPhone: String,
    officialEmail: String,
    website: String
  },
  staffContacts: {
    adminChief: {
      name: String,
      mobile: String
    },
    accountChief: {
      name: String,
      mobile: String
    }
  },
  dataCollectionContact: {
    name: String,
    designation: String,
    phone: String,
    email: String
  },

  // Section 2: Location Details
  location: {
    province: { type: String, required: true },
    district: { type: String, required: true },
    localLevel: { type: String, required: true },
    wardNo: { type: Number, required: true },
    streetTole: String,
    landmark: String,
    latitude: String,
    longitude: String,
    googleMapsLink: String
  },

  // Section 3: Infrastructure & Facilities
  infrastructure: {
    // A. Total Land Area
    landArea: {
      traditionalUnits: {
        bigaha: Number,
        katha: Number,
        dhur: Number,
        ropani: Number,
        ana: Number,
        daam: Number,
        paisa: Number
      },
      squareMeters: Number,
      acquisitionDate: Date,
      taxClearanceStatus: String,
      haalsabikStatus: String
    },

    // B. Land Ownership Breakdown
    landOwnership: {
      lalpurja: {
        area: Number,
        address: String
      },
      bhogadhikar: {
        area: Number,
        address: String
      },
      localGovernment: {
        area: Number,
        address: String
      },
      other: {
        area: Number,
        address: String
      }
    },

    // C. Land Use Status
    landUse: {
      buildingArea: Number,
      playgroundArea: Number,
      naturalForestArea: Number,
      plantationArea: Number,
      leasedArea: Number,
      leaseIncome: Number,
      encroachmentExists: Boolean,
      encroachmentDetails: String,
      protectionSteps: String,
      commercialUseSuggestions: String,
      commercialPlans: String,
      masterPlanExists: Boolean,
      masterPlanAttachment: String,
      suggestions: String
    },

    // D. Buildings and Rooms
    buildings: [{
      buildingName: String,
      totalRooms: Number,
      classrooms: Number,
      labs: Number,
      library: Number,
      administrative: Number,
      other: Number,
      condition: {
        type: String,
        enum: ['Excellent', 'Good', 'Fair', 'Poor']
      },
      media: {
        images: [{
          url: String,
          caption: String,
          uploadDate: {
            type: Date,
            default: Date.now
          },
          fileSize: Number,
          mimeType: String
        }],
        videos: [{
          url: String,
          caption: String,
          uploadDate: {
            type: Date,
            default: Date.now
          },
          fileSize: Number,
          duration: Number,
          mimeType: String,
          thumbnail: String
        }]
      }
    }],

    // E. Future Land Use Plan (NEW)
    futureLandUsePlan: {
      prepared: Boolean,
      dismantled: Boolean,
      proposalDocumentsSubmitted: Boolean,
      constructionStatus: {
        type: String,
        // enum: ['Not Started', 'In Progress', 'Completed', 'On Hold']
      },
      structureType: String,
      structureStatus: String,
      retrofittingPlan: String,
      fundSource: String,
      fundAmount: Number,
      fundUtilizedPercentage: Number,
      fundUtilizationIssues: String,
      documentsSubmittedTo: String,
      purposeOfBuilding: String
    },

    // F. Water & Sanitation (NEW)
    waterSanitation: {
      waterDrainageSystem: {
        available: Boolean,
        status: {
          type: String,
          // enum: ['Functional', 'Non-Functional', 'Partially Functional']
        }
      },
      sewerageSystem: {
        available: Boolean,
        status: {
          type: String,
          // enum: ['Functional', 'Non-Functional', 'Partially Functional']
        }
      },
      waterSeepage: {
        status: {
          type: String
     
        }
      },
      drinkingWater: {
        available: Boolean,
        status: {
          type: String,
          // enum: ['Functional', 'Non-Functional', 'Partially Functional']
        }
      },
      toiletFacilities: {
        available: Boolean,
        maleToilets: Number,
        femaleToilets: Number,
        disabledFriendlyToilets: Number
      }
    },

    // G. Health, Hygiene & Sanitation
    healthSanitation: {
      toilets: {
        male: Number,
        female: Number,
        disabledFriendly: Number
      },
      drinkingWater: {
        available: Boolean,
        qualityTested: Boolean,
        purificationSystem: String
      },
      wasteManagement: {
        segregation: Boolean,
        disposalMethod: String,
        recycling: Boolean
      },
      medicalFacilities: {
        firstAid: Boolean,
        healthPost: Boolean,
        staffAvailable: Boolean
      }
    }
  },

  // Section 4: Academic Programs & Enrollment
  academicPrograms: {
    totalFaculties: Number,
    programs: [{
      institution: String,
      level: {
        type: String,
        enum: ['Certificate', 'Diploma', 'Bachelor', 'Master', 'PhD']
      },
      programName: String,
      totalStudents: Number,
      maleStudents: Number,
      femaleStudents: Number,
      otherStudents: Number,
      scholarshipStudents: Number,
      newAdmissions: Number,
      graduatedStudents: Number,
      passPercentage: Number,
      affiliatedTo: String
    }],
    enrollment: {
      total: Number,
      male: Number,
      female: Number,
      other: Number,
      programBreakdown: [{
        programName: String,
        total: Number,
        male: Number,
        female: Number,
        other: Number
      }]
    }
  },

  // Section 5: Project Planning
  projectPlanning: {
    immediateConstruction: String,
    futureConstruction: String,
    priorityWork: {
      p1: String,
      p2: String,
      p3: String
    },
    ongoingProjects: [{
      projectName: String,
      startDate: Date,
      expectedCompletion: Date,
      budget: Number,
      attachments: String,
      status: {
        type: String,
        enum: ['Planning', 'In Progress', 'Completed', 'On Hold']
      }
    }]
  },

  // Section 6: Staff Information
  staff: {
    academic: [{
      name: String,
      designation: String,
      department: String,
      qualification: String,
      experience: Number,
      employmentType: {
        type: String,
        enum: ['Permanent', 'Contract', 'Part-time']
      }
    }],
    administrative: [{
      name: String,
      designation: String,
      department: String,
      employmentType: String
    }]
  },

  // Section 7: Educational Tools & Technology
  educationalTechnology: {
    digitalClassrooms: Number,
    computerLabs: Number,
    computersAvailable: Number,
    internetAvailability: {
      available: Boolean,
      speed: String,
      provider: String
    },
    libraryResources: {
      physicalBooks: Number,
      ebooks: Number,
      journals: Number,
      digitalDatabase: Boolean
    },
    learningManagementSystem: {
      name: String,
      active: Boolean
    }
  },

  // Section 8: Student Enrollment & Graduation (Last 5 Years)
  historicalData: {
    enrollment: [{
      academicYear: String,
      total: Number,
      male: Number,
      female: Number,
      other: Number
    }],
    graduation: [{
      academicYear: String,
      totalGraduates: Number,
      programWise: [{
        programName: String,
        graduates: Number
      }]
    }]
  },

  // Section 9: Financial Information
  financials: {
    expenditure: [{
      fiscalYear: String,
      totalExpenditure: Number,
      academic: Number,
      administrative: Number,
      infrastructure: Number,
      other: Number
    }],
    auditReports: [{
      fiscalYear: String,
      reportUrl: String,
      cleanReport: Boolean,
      remarks: String
    }],
    physicalInspection: [{
      fiscalYear: String,
      reportUrl: String,
      findings: String,
      actionsTaken: String
    }]
  },

  // Section 10: Operational Management
  operationalManagement: {
    administrativeEfficiency: {
      streamlined: Boolean,
      turnaroundTime: String,
      costReduction: String,
      processingTime: String,
      budgetVariance: String,
      efficiencyReviews: String,
      improvementInitiatives: Number,
      sustainabilityAligned: Boolean,
      sustainabilityPlans: String
    }
  },

  // Section 11: Audit & Risk Management
  auditRisk: {
    commonIrregularities: [String],
    resolutionTime: String,
    lastQuarterIrregularities: Number,
    averageResolutionDays: Number,
    compliancePercentage: Number,
    recurringIssues: [{
      issue: String,
      resolution: String
    }],
    riskMitigation: {
      strategiesImplemented: Number,
      successRate: Number
    }
  },

  // Section 12: Stakeholder Engagement
  stakeholderEngagement: {
    satisfactionRating: Number,
    feedbackSubmissions: {
      total: Number,
      actionable: Number
    },
    communityEvents: {
      frequency: String,
      attendanceRate: Number
    },
    communityPartnerships: Number,
    safetyIncidents: Number
  },

  // Section 13: Digital Infrastructure
  digitalInfrastructure: {
    systemUptime: Number,
    monthlyITIssues: Number,
    resolutionTime: String,
    userSatisfaction: Number,
    updatedTools: Number,
    digitizedOperations: Number
  },

  // Section 14: Environmental Sustainability
  sustainability: {
    energyConsumption: Number,
    wasteRecycling: Number,
    carbonFootprint: Number,
    greenCertifications: Number,
    renewableEnergy: Number
  },

  // Section 15: Additional Monitoring Areas
  additionalAreas: {
    financialHealth: {
      budgetVariance: Number,
      revenueStreams: Number,
      growthRates: String,
      fundingGap: Number
    },
    humanResources: {
      turnoverRate: Number,
      trainingHours: Number,
      satisfactionScore: Number,
      openPositions: Number,
      vacancyDuration: String
    },
    campusSecurity: {
      emergencyDrills: Number,
      responseTime: Number,
      securityIncidents: Number,
      securityRatio: Number
    },
    transportation: {
      waitingTime: String,
      parkingOccupancy: Number,
      optionsAvailable: Number,
      trafficIncidents: Number
    },
    studentLife: {
      participationRate: Number,
      eventsHeld: Number,
      averageAttendance: Number,
      satisfactionRating: Number,
      newClubs: Number
    },
    research: {
      activeProjects: Number,
      grantSuccessRate: Number,
      publicationsPerFaculty: Number,
      externalPartnerships: Number
    },
    governance: {
      complianceRate: Number,
      policyBreaches: Number,
      resolutionTime: Number,
      reviewFrequency: String
    },
    communication: {
      disseminationTime: String,
      satisfactionScore: Number,
      crisisDrills: Number,
      inquiryResponseTime: String
    }
  },

  // Form Status and Metadata
  formStatus: {
    type: String,
    enum: ['Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected'],
    default: 'Draft'
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  submissionDate: {
    type: Date,
    default: Date.now
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
collegeFormSchema.index({ collegeName: 1 });
collegeFormSchema.index({ 'location.district': 1 });
collegeFormSchema.index({ formStatus: 1 });
collegeFormSchema.index({ 'location.province': 1, 'location.district': 1 });

// Pre-save middleware to update lastModified
collegeFormSchema.pre('save', function(next) {
  this.lastModified = Date.now();
  next();
});

// Static method to find by college name
collegeFormSchema.statics.findByCollegeName = function(name) {
  return this.find({ collegeName: new RegExp(name, 'i') });
};

// Instance method to get summary
collegeFormSchema.methods.getSummary = function() {
  return {
    collegeName: this.collegeName,
    campusType: this.campusType,
    district: this.location.district,
    totalPrograms: this.academicPrograms.programs.length,
    totalStudents: this.academicPrograms.enrollment.total,
    formStatus: this.formStatus
  };
};

module.exports = mongoose.model('CollegeForm', collegeFormSchema);