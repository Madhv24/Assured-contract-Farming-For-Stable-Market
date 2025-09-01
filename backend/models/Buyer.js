const mongoose = require('mongoose');

const buyerSchema = new mongoose.Schema({
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
  isAvailable: {
    type: Boolean,
    default: true
  },
  name: { type: String, trim: true, default: '' },
  companyName: {
    type: String,
    trim: true
  },
  contactInfo: {
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pincode: { type: String, default: '' },
    default: {}
  },
  cropRequirements: [{
    cropName: { type: String, default: '' },
    quantity: { type: Number, default: 0 },
    unit: { type: String, enum: ['kg', 'tons', 'quintals'], default: 'kg' },
    season: { type: String, default: '' },
    isActive: { type: Boolean, default: true }
  }],
  preferredArea: { type: String, default: '' },
  preferredRegion: { type: String, default: '' },
  priceRange: {
    min: { type: Number, default: 0 },
    max: { type: Number, default: 0 },
    unit: { type: String, enum: ['per kg', 'per ton', 'per quintal'], default: 'per kg' }
  },
  requirementDocs: [{
    filename: String,
    originalName: String,
    path: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  images: [{
    filename: String,
    originalName: String,
    path: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
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
      ref: 'Contract'
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

buyerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Buyer', buyerSchema);
