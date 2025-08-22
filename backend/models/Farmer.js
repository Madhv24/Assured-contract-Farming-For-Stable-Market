const mongoose = require('mongoose');

const farmerSchema = new mongoose.Schema({
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
  name: {
    type: String,
    trim: true,
    default: ''
  },
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
  farmDetails: {
    size: { type: Number, default: 0 },
    unit: { type: String, enum: ['acres', 'hectares', 'sqft'], default: 'acres' },
    location: { type: String, default: '' },
    default: {}
  },
  cropDetails: [{
    name: { type: String, default: '' },
    quantity: { type: Number, default: 0 },
    unit: { type: String, enum: ['kg', 'tons', 'quintals'], default: 'kg' },
    season: { type: String, default: '' },
    isAvailable: { type: Boolean, default: true }
  }],
  climateSuitability: { type: String, default: '' },
  resourceAvailability: {
    irrigation: {
      type: Boolean,
      default: false
    },
    machinery: {
      type: Boolean,
      default: false
    },
    storage: {
      type: Boolean,
      default: false
    },
    labor: {
      type: Boolean,
      default: false
    }
  },
  contractPapers: [{
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
  matchedLandowner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Landowner'
  },
  matchedBuyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Buyer'
  },
  interestedLandowners: [{
    landownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Landowner'
    },
    interestDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    }
  }],
  interestedBuyers: [{
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Buyer'
    },
    interestDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
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

farmerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Farmer', farmerSchema);
