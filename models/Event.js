const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: 400,
      default: '',
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10000,
    },
    eventDate: {
      type: Date,
      required: true,
    },
    location: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },
    category: {
      type: String,
      trim: true,
      maxlength: 80,
      default: 'General',
    },
    images: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'published',
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

eventSchema.index({ eventDate: -1, createdAt: -1 });
eventSchema.index({ status: 1, isFeatured: 1 });

module.exports = mongoose.model('Event', eventSchema);
