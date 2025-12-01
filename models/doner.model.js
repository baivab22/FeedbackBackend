const mongoose = require('mongoose');

const donorSchema = new mongoose.Schema({
  donorName: {
    type: String,
    required: [true, 'Donor name is required'],
    trim: true
  },
  fundOfficialName: {
    type: String,
    required: [true, 'Fund official name is required'],
    trim: true
  },
  principalAmountOfEndowment: {
    type: Number,
    required: [true, 'Principal amount of endowment is required'],
    min: [0, 'Principal amount cannot be negative']
  },
  natureOfEndowment: {
    type: String,
    required: [true, 'Nature of endowment is required'],
    trim: true
  },
  relatedDepart: {
    type: String,
    required: [true, 'Related department is required'],
    trim: true
  },
  agreementDate: {
    type: Date,
    required: [true, 'Agreement date is required']
  },
  photo: {
    type: String,
    default: 'https://via.placeholder.com/150'
  },
  donorContactNumber: {
    type: String,
    required: [true, 'Donor contact number is required'],
    trim: true
  },
  donorEmail: {
    type: String,
    required: [true, 'Donor email is required'],
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  // New fields
  personInCareOf: {
    type: String,
    trim: true,
    default: ''
  },
  reportingContactNumber: {
    type: String,
    trim: true,
    default: ''
  },
  reportingAddress: {
    type: String,
    trim: true,
    default: ''
  },
  fundingPlan: {
    type: String,
    trim: true,
    default: ''
  },
  amountOfEndowment: {
    type: Number,
    required: [true, 'Amount of endowment is required'],
    min: [0, 'Amount of endowment cannot be negative']
  },
  termsOfEndowmentFund: {
    type: String,
    trim: true,
    default: ''
  },
  typesOfEndowmentPlan: {
    type: String,
    trim: true,
    default: ''
  },
  installmentsOfEndowment: {
    type: String,
    trim: true,
    default: ''
  },
  purposeOfUsingEndowmentReturns: {
    type: String,
    trim: true,
    default: ''
  },
  endowmentDetailsPdf: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

// Index for better query performance
donorSchema.index({ donorName: 1 });
donorSchema.index({ fundOfficialName: 1 });
donorSchema.index({ relatedDepart: 1 });
donorSchema.index({ natureOfEndowment: 1 });
donorSchema.index({ agreementDate: 1 });

module.exports = mongoose.model('Donor', donorSchema);