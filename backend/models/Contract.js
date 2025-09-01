const mongoose = require('mongoose');

const progressUpdateSchema = new mongoose.Schema({
  step: {
    type: Number,
    required: true,
    min: 1,
    max: 7
  },
  title: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed'],
    default: 'Pending'
  },
  notes: {
    type: String,
    default: ''
  },
  files: [{
    filename: String,
    originalName: String,
    path: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const contractSchema = new mongoose.Schema({
  // Generic parties (optional; for future extensibility across roles)
  partyAId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'roleARef',
  },
  partyBId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'roleBRef',
  },
  roleA: { type: String, enum: ['Farmer', 'Buyer', 'Landowner'] },
  roleB: { type: String, enum: ['Farmer', 'Buyer', 'Landowner'] },
  // Internal refs for dynamic population
  roleARef: { type: String, enum: ['Farmer', 'Buyer', 'Landowner'] },
  roleBRef: { type: String, enum: ['Farmer', 'Buyer', 'Landowner'] },
  title: {
    type: String,
  },
  description: {
    type: String,
  },
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farmer',
    required: true
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Buyer',
    required: true
  },
  documentUrl: {
    type: String,
  },
  cropName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    enum: ['kg', 'tons', 'quintals'],
    default: 'kg'
  },
  price: {
    type: Number,
    required: true
  },
  priceUnit: {
    type: String,
    enum: ['per kg', 'per ton', 'per quintal'],
    default: 'per kg'
  },
  contractDate: {
    type: Date,
    default: Date.now
  },
  expectedDeliveryDate: {
    type: Date,
    required: true
  },
  agreementDate: {
    type: Date,
  },
  contractFile: {
    type: String,
  },
  farmerApproved: {
    type: Boolean,
    default: false
  },
  buyerApproved: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['Pending', 'Active', 'Completed', 'Cancelled'],
    default: 'Pending'
  },
  progressUpdates: [progressUpdateSchema],
  contractDocuments: [{
    filename: String,
    originalName: String,
    path: String,
    uploadedAt: {
      type: Date,
      default: Date.now
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

contractSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Contract', contractSchema);

