const mongoose = require('mongoose');

const donaterSchema = new mongoose.Schema({
  donaterName: {
    type: String,
    required: [true, 'Donater name is required'],
    trim: true
  },
  prizeName: {
    type: String,
    required: [true, 'Prize name is required'],
    trim: true
  },
    prizeAmount: {
    type: Number,
    required: [true, 'Prize amount is required'],
    // trim: true
  },
  prizeType: {
    type: String,
    required: [true, 'Prize type is required'],
    enum: ['Trophy', 'Medal', 'Certificate', 'Cash', 'Scholarship', 'Other'],
    default: 'Other'
  },
  relatedDepart: {
    type: String,
    required: [true, 'Related department is required'],
    trim: true
  },
  contractDate: {
    type: Date,
    required: [true, 'Contract date is required']
  },
  photo: {
    type: String,
    default: 'https://via.placeholder.com/150'
  },
  contactNumber: {
    type: String,
    required: [true, 'Contact number is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Donater', donaterSchema);