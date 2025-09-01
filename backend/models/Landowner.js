const mongoose = require('mongoose');

const landownerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['Available', 'Not Available'],
    default: 'Available'
  },
  name: {
    type: String,
    trim: true,
    default: ''
  },
  contactInfo: {
    phone: {
      type: String,
      default: ''
    },
    address: {
      type: String,
      default: ''
    },
    city: {
      type: String,
      default: ''
    },
    state: {
      type: String,
      default: ''
    },
    pincode: {
      type: String,
      default: ''
    },
    default: {}
  },
  landDetails: {
    size: {
      type: Number,
      default: 0
    },
    unit: {
      type: String,
      enum: ['acres', 'hectares', 'sqft'],
      default: 'acres'
    },
    location: {
      type: String,
      default: ''
    },
    area: {
      type: String,
      default: ''
    },
    soilType: {
      type: String,
      default: ''
    },
    climaticConditions: {
      type: String,
      default: ''
    },
    default: {}
  },
  availableCrops: [{
    type: String,
    trim: true
  }],
  contractPapers: [{
    filename: String,
    originalName: String,
    path: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  landImages: [{
    filename: String,
    originalName: String,
    path: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isAvailable: {
    type: Boolean,
    default: true
  },
  requests: [{
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Request' },
    fromRole: { type: String, enum: ['landowner', 'farmer', 'buyer'] },
    fromProfileId: { type: mongoose.Schema.Types.ObjectId },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
  }],
  matchedFarmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farmer'
  },
  interestedFarmers: [{
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farmer'
    },
    interestDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    },
    contractStatus: {
      type: String,
      enum: ['none', 'pending', 'active', 'completed'],
      default: 'none'
    },
    contractId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LandownerContract'
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

landownerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Landowner', landownerSchema);
