const mongoose = require('mongoose');

const progressUpdateSchema = new mongoose.Schema({
  step: {
    type: String,
    enum: [
      'Land Preparation',
      'Seed Sowing',
      'Irrigation',
      'Fertilizer Application',
      'Pest Control',
      'Crop Growth',
      'Harvesting',
      'Land Restoration'
    ],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  images: [{
    filename: String,
    originalName: String,
    path: String
  }],
  date: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['In Progress', 'Completed'],
    default: 'In Progress'
  }
});

const landownerContractSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farmer',
    required: true
  },
  landownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Landowner',
    required: true
  },
  landDetails: {
    size: Number,
    unit: {
      type: String,
      enum: ['acres', 'hectares', 'sqft'],
      default: 'acres'
    },
    location: String,
    soilType: String
  },
  contractTerms: {
    duration: Number, // in months
    startDate: Date,
    endDate: Date,
    rentAmount: Number,
    rentUnit: {
      type: String,
      enum: ['per month', 'per acre', 'per hectare'],
      default: 'per month'
    }
  },
  contractFile: {
    filename: String,
    originalName: String,
    path: String
  },
  farmerApproved: {
    type: Boolean,
    default: false
  },
  landownerApproved: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['Pending', 'Active', 'Completed', 'Cancelled'],
    default: 'Pending'
  },
  progressUpdates: [progressUpdateSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
landownerContractSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('LandownerContract', landownerContractSchema);
