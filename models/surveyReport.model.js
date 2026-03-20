const mongoose = require('mongoose');

const surveyReportSchema = new mongoose.Schema(
  {
    collegeName: {
      type: String,
      required: [true, 'College name is required'],
      trim: true
    },
    reportYear: {
      type: String,
      required: [true, 'Report year is required'],
      match: /^\d{4}$/,
      trim: true
    },
    pdfFile: {
      filename: String,
      path: String,
      originalName: String,
      size: Number,
      uploadDate: {
        type: Date,
        default: Date.now
      }
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    description: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    remarks: String,
    viewCount: {
      type: Number,
      default: 0
    },
    college: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CollegeForm'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Index for faster searching
surveyReportSchema.index({ collegeName: 1, reportYear: 1 });
surveyReportSchema.index({ uploadedBy: 1 });
surveyReportSchema.index({ status: 1 });
surveyReportSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SurveyReport', surveyReportSchema);
