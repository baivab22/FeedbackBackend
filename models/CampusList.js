const mongoose = require('mongoose');

const campusListSchema = new mongoose.Schema(
  {
    SN: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    campusname: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    localAddress: {
      type: String,
      trim: true,
      default: '',
      maxlength: 300,
    },
    District: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },
    fullAddress: {
      type: String,
      trim: true,
      default: '',
      maxlength: 400,
    },
    principlename: {
      type: String,
      trim: true,
      default: '',
      maxlength: 200,
    },
    contactNumber: {
      type: String,
      trim: true,
      default: '',
      maxlength: 40,
    },
    emailAddress: {
      type: String,
      trim: true,
      default: '',
      maxlength: 200,
    },
  },
  {
    timestamps: true,
  }
);

campusListSchema.index({ campusname: 1 });

module.exports = mongoose.model('CampusList', campusListSchema);
