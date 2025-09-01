const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Contract = require('../models/Contract');
const { emitProgressUpdate, emitProgressFilesUpdate } = require('../socket');
const Farmer = require('../models/Farmer');
const Buyer = require('../models/Buyer');

const router = express.Router();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT token
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token.' });
  }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/progress');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image and document files are allowed!'));
    }
  }
});

// Predefined progress stages
const PROGRESS_STAGES = [
  { step: 1, title: 'Contract signed with Buyer' },
  { step: 2, title: 'Seeds purchased' },
  { step: 3, title: 'Seeds planted in the field' },
  { step: 4, title: 'Crop growth update (percentage grown / description)' },
  { step: 5, title: 'Fertilizer requirement update (type & quantity needed)' },
  { step: 6, title: 'Crop ready for harvesting' },
  { step: 7, title: 'Crop ready for delivery' }
];

// Get all contracts for the current user (Farmer or Buyer)
router.get('/contracts', auth, async (req, res) => {
  try {
    const { role, userId } = req.user;
    let contracts = [];

    if (role === 'farmer') {
      const farmer = await Farmer.findOne({ userId });
      if (farmer) {
        contracts = await Contract.find({ farmerId: farmer._id })
          .populate('buyerId', 'name companyName contactInfo')
          .sort({ createdAt: -1 });
      }
    } else if (role === 'buyer') {
      const buyer = await Buyer.findOne({ userId });
      if (buyer) {
        contracts = await Contract.find({ buyerId: buyer._id })
          .populate('farmerId', 'name companyName contactInfo farmDetails')
          .sort({ createdAt: -1 });
      }
    }

    res.json({ contracts });
  } catch (error) {
    console.error('Get contracts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a specific contract with progress updates
router.get('/contracts/:contractId', auth, async (req, res) => {
  try {
    const { contractId } = req.params;
    const { role, userId } = req.user;

    let contract;
    if (role === 'farmer') {
      const farmer = await Farmer.findOne({ userId });
      contract = await Contract.findOne({ _id: contractId, farmerId: farmer._id })
        .populate('buyerId', 'name companyName contactInfo');
    } else if (role === 'buyer') {
      const buyer = await Buyer.findOne({ userId });
      contract = await Contract.findOne({ _id: contractId, buyerId: buyer._id })
        .populate('farmerId', 'name companyName contactInfo farmDetails');
    }

    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }

    // Initialize progress updates if not exists
    if (!contract.progressUpdates || contract.progressUpdates.length === 0) {
      contract.progressUpdates = PROGRESS_STAGES.map(stage => ({
        step: stage.step,
        title: stage.title,
        status: 'Pending',
        notes: '',
        files: [],
        updatedAt: new Date()
      }));
      await contract.save();
    }

    res.json({ contract });
  } catch (error) {
    console.error('Get contract error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update progress for a specific stage (only when contract is Active)
router.put('/contracts/:contractId/progress/:step', auth, async (req, res) => {
  try {
    const { contractId, step } = req.params;
    const { status, notes } = req.body;
    const { role, userId } = req.user;

    // Verify user has access to this contract
    let contract;
    if (role === 'farmer') {
      const farmer = await Farmer.findOne({ userId });
      contract = await Contract.findOne({ _id: contractId, farmerId: farmer._id });
    } else if (role === 'buyer') {
      const buyer = await Buyer.findOne({ userId });
      contract = await Contract.findOne({ _id: contractId, buyerId: buyer._id });
    }

    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }

    // Only farmers can update progress
    if (role !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can update progress' });
    }

    // Find and update the specific progress stage
    const progressIndex = contract.progressUpdates.findIndex(p => p.step === parseInt(step));
    if (progressIndex === -1) {
      return res.status(404).json({ message: 'Progress stage not found' });
    }

    if (contract.status !== 'Active') {
      return res.status(400).json({ message: 'Progress updates allowed only for Active contracts' });
    }

    contract.progressUpdates[progressIndex].status = status;
    contract.progressUpdates[progressIndex].notes = notes || '';
    contract.progressUpdates[progressIndex].updatedAt = new Date();

    await contract.save();

    // Emit real-time update
    try {
      emitProgressUpdate(contractId, parseInt(step), status, notes, contract.progressUpdates[progressIndex].updatedAt);
    } catch (_) {}

    res.json({ 
      message: 'Progress updated successfully',
      progress: contract.progressUpdates[progressIndex]
    });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload files for a progress stage (only when contract is Active)
router.post('/contracts/:contractId/progress/:step/files', auth, upload.array('files', 5), async (req, res) => {
  try {
    const { contractId, step } = req.params;
    const { role, userId } = req.user;

    // Verify user has access to this contract
    let contract;
    if (role === 'farmer') {
      const farmer = await Farmer.findOne({ userId });
      contract = await Contract.findOne({ _id: contractId, farmerId: farmer._id });
    }

    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }

    // Only farmers can upload files
    if (role !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can upload files' });
    }
    if (contract.status !== 'Active') {
      return res.status(400).json({ message: 'File uploads allowed only for Active contracts' });
    }

    // Find the specific progress stage
    const progressIndex = contract.progressUpdates.findIndex(p => p.step === parseInt(step));
    if (progressIndex === -1) {
      return res.status(404).json({ message: 'Progress stage not found' });
    }

    // Add uploaded files to the progress stage
    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: `/uploads/progress/${file.filename}`,
      uploadedAt: new Date()
    }));

    contract.progressUpdates[progressIndex].files.push(...uploadedFiles);
    contract.progressUpdates[progressIndex].updatedAt = new Date();

    await contract.save();

    // Emit real-time update
    try {
      emitProgressFilesUpdate(contractId, parseInt(step), contract.progressUpdates[progressIndex].files);
    } catch (_) {}

    res.json({ 
      message: 'Files uploaded successfully',
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Upload files error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a file from progress stage
router.delete('/contracts/:contractId/progress/:step/files/:filename', auth, async (req, res) => {
  try {
    const { contractId, step, filename } = req.params;
    const { role, userId } = req.user;

    // Verify user has access to this contract
    let contract;
    if (role === 'farmer') {
      const farmer = await Farmer.findOne({ userId });
      contract = await Contract.findOne({ _id: contractId, farmerId: farmer._id });
    }

    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }

    // Only farmers can delete files
    if (role !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can delete files' });
    }

    // Find the specific progress stage
    const progressIndex = contract.progressUpdates.findIndex(p => p.step === parseInt(step));
    if (progressIndex === -1) {
      return res.status(404).json({ message: 'Progress stage not found' });
    }

    // Remove the file
    const fileIndex = contract.progressUpdates[progressIndex].files.findIndex(f => f.filename === filename);
    if (fileIndex === -1) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, '../uploads/progress', filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    contract.progressUpdates[progressIndex].files.splice(fileIndex, 1);
    contract.progressUpdates[progressIndex].updatedAt = new Date();

    await contract.save();

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`contract_${contractId}`).emit('progress:files:update', {
        contractId,
        step: parseInt(step),
        files: contract.progressUpdates[progressIndex].files
      });
    }

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new contract (when farmer and buyer accept each other)
router.post('/contracts', auth, async (req, res) => {
  try {
    const { farmerId, buyerId, cropName, quantity, unit, price, priceUnit, expectedDeliveryDate } = req.body;
    const { role, userId } = req.user;

    // Verify user permissions
    if (role !== 'farmer' && role !== 'buyer') {
      return res.status(403).json({ message: 'Only farmers and buyers can create contracts' });
    }

    // Verify the users exist and are matched
    const farmer = await Farmer.findById(farmerId);
    const buyer = await Buyer.findById(buyerId);

    if (!farmer || !buyer) {
      return res.status(404).json({ message: 'Farmer or Buyer not found' });
    }

    // Check if they have accepted each other
    const farmerAcceptedBuyer = farmer.interestedBuyers.find(i => i.buyerId.toString() === buyerId && i.status === 'accepted');
    const buyerAcceptedFarmer = buyer.interestedFarmers.find(i => i.farmerId.toString() === farmerId && i.status === 'accepted');

    if (!farmerAcceptedBuyer || !buyerAcceptedFarmer) {
      return res.status(400).json({ message: 'Both parties must accept each other before creating a contract' });
    }

    // Create the contract
    const contract = new Contract({
      farmerId,
      buyerId,
      cropName,
      quantity,
      unit,
      price,
      priceUnit,
      expectedDeliveryDate: new Date(expectedDeliveryDate),
      progressUpdates: PROGRESS_STAGES.map(stage => ({
        step: stage.step,
        title: stage.title,
        status: 'Pending',
        notes: '',
        files: [],
        updatedAt: new Date()
      }))
    });

    await contract.save();

    res.status(201).json({ 
      message: 'Contract created successfully',
      contract
    });
  } catch (error) {
    console.error('Create contract error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get progress statistics for a contract
router.get('/contracts/:contractId/stats', auth, async (req, res) => {
  try {
    const { contractId } = req.params;
    const { role, userId } = req.user;

    let contract;
    if (role === 'farmer') {
      const farmer = await Farmer.findOne({ userId });
      contract = await Contract.findOne({ _id: contractId, farmerId: farmer._id });
    } else if (role === 'buyer') {
      const buyer = await Buyer.findOne({ userId });
      contract = await Contract.findOne({ _id: contractId, buyerId: buyer._id });
    }

    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }

    const totalStages = contract.progressUpdates.length;
    const completedStages = contract.progressUpdates.filter(p => p.status === 'Completed').length;
    const pendingStages = totalStages - completedStages;
    const progressPercentage = Math.round((completedStages / totalStages) * 100);

    res.json({
      stats: {
        totalStages,
        completedStages,
        pendingStages,
        progressPercentage
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

// Aliases to match requested API shape
// PUT /api/progress/update/:contractId
router.put('/update/:contractId', auth, async (req, res) => {
  req.params.contractId = req.params.contractId;
  req.params.step = req.body.step;
  req.body = { status: req.body.status, notes: req.body.notes };
  return router.handle({ ...req, method: 'PUT', url: `/contracts/${req.params.contractId}/progress/${req.params.step}` }, res);
});

// POST /api/progress/files/:contractId/:step
router.post('/files/:contractId/:step', auth, upload.array('files', 5), async (req, res) => {
  req.params.contractId = req.params.contractId;
  req.params.step = req.params.step;
  return router.handle({ ...req, method: 'POST', url: `/contracts/${req.params.contractId}/progress/${req.params.step}/files` }, res);
});

// GET /api/progress/:contractId
router.get('/:contractId', auth, async (req, res) => {
  req.params.contractId = req.params.contractId;
  return router.handle({ ...req, method: 'GET', url: `/contracts/${req.params.contractId}` }, res);
});

