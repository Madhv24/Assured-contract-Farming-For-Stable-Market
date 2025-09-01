const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const LandownerContract = require('../models/LandownerContract');
const Farmer = require('../models/Farmer');
const Landowner = require('../models/Landowner');
const { getIO } = require('../socket');

const router = express.Router();

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

// Configure multer for contract file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/landowner-contracts');
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
      cb(new Error('Only image, PDF, and document files are allowed!'));
    }
  }
});

// Create contract with file upload
router.post('/createContractWithUpload', auth, upload.single('contractFile'), async (req, res) => {
  try {
    const { title, description, farmerId, landownerId, landDetails, contractTerms } = req.body;
    
    // Validate required fields
    if (!title || !description || !farmerId || !landownerId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if both parties have accepted interest
    const farmer = await Farmer.findById(farmerId);
    const landowner = await Landowner.findById(landownerId);
    
    if (!farmer || !landowner) {
      return res.status(404).json({ message: 'Farmer or Landowner not found' });
    }

    // Check if there's mutual interest
    const farmerInterestedInLandowner = farmer.interestedLandowners?.some(i => 
      i.landownerId?.toString() === landownerId && i.status === 'accepted'
    );
    
    const landownerInterestedInFarmer = landowner.interestedFarmers?.some(i => 
      i.farmerId?.toString() === farmerId && i.status === 'accepted'
    );

    console.log('Debug - Farmer ID:', farmerId);
    console.log('Debug - Landowner ID:', landownerId);
    console.log('Debug - Farmer interestedLandowners:', farmer.interestedLandowners);
    console.log('Debug - Landowner interestedFarmers:', landowner.interestedFarmers);
    console.log('Debug - farmerInterestedInLandowner:', farmerInterestedInLandowner);
    console.log('Debug - landownerInterestedInFarmer:', landownerInterestedInFarmer);

    if (!farmerInterestedInLandowner || !landownerInterestedInFarmer) {
      return res.status(400).json({ message: 'Both parties must accept interest before creating contract' });
    }

    // Check if contract already exists
    const existingContract = await LandownerContract.findOne({
      farmerId,
      landownerId,
      status: { $in: ['Pending', 'Active'] }
    });

    if (existingContract) {
      return res.status(400).json({ message: 'Contract already exists between these parties' });
    }

    // Create contract
    const contract = new LandownerContract({
      title,
      description,
      farmerId,
      landownerId,
      landDetails: landDetails ? JSON.parse(landDetails) : {},
      contractTerms: contractTerms ? JSON.parse(contractTerms) : {},
      contractFile: req.file ? {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: `/uploads/landowner-contracts/${req.file.filename}`
      } : null
    });

    await contract.save();

    // Update contract status in both profiles
    await Farmer.updateOne(
      { _id: farmerId, 'interestedLandowners.landownerId': landownerId },
      { 
        $set: { 
          'interestedLandowners.$.contractStatus': 'pending',
          'interestedLandowners.$.contractId': contract._id
        }
      }
    );

    await Landowner.updateOne(
      { _id: landownerId, 'interestedFarmers.farmerId': farmerId },
      { 
        $set: { 
          'interestedFarmers.$.contractStatus': 'pending',
          'interestedFarmers.$.contractId': contract._id
        }
      }
    );

    // Emit socket event
    try {
      const io = getIO();
      if (io) {
        io.to(`user_${farmer.userId}`).emit('landownerContract:created', { contract });
        io.to(`user_${landowner.userId}`).emit('landownerContract:created', { contract });
      }
    } catch (e) {}

    res.json({ message: 'Contract created successfully', contract });
  } catch (error) {
    console.error('Create landowner contract error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve contract
router.post('/:id/approve', auth, async (req, res) => {
  try {
    const contract = await LandownerContract.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }

    // Check if user is authorized to approve
    const userRole = req.user.role;
    let isAuthorized = false;

    console.log('Debug - User role:', userRole);
    console.log('Debug - User ID:', req.user.userId);
    console.log('Debug - Contract farmer ID:', contract.farmerId);
    console.log('Debug - Contract landowner ID:', contract.landownerId);

    if (userRole === 'farmer') {
      // For farmers, check if they are the farmer in the contract
      const farmer = await Farmer.findOne({ userId: req.user.userId });
      console.log('Debug - Found farmer:', farmer?._id);
      if (farmer && farmer._id.toString() === contract.farmerId.toString()) {
        isAuthorized = true;
      }
    } else if (userRole === 'landowner') {
      // For landowners, check if they are the landowner in the contract
      const landowner = await Landowner.findOne({ userId: req.user.userId });
      console.log('Debug - Found landowner:', landowner?._id);
      if (landowner && landowner._id.toString() === contract.landownerId.toString()) {
        isAuthorized = true;
      }
    }

    console.log('Debug - Is authorized:', isAuthorized);

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized to approve this contract' });
    }

    // Update approval status
    if (userRole === 'farmer') {
      contract.farmerApproved = true;
    } else if (userRole === 'landowner') {
      contract.landownerApproved = true;
    }

    // Check if both parties approved
    if (contract.farmerApproved && contract.landownerApproved) {
      contract.status = 'Active';
      
      // Update contract status in both profiles
      await Farmer.updateOne(
        { _id: contract.farmerId, 'interestedLandowners.landownerId': contract.landownerId },
        { $set: { 'interestedLandowners.$.contractStatus': 'active' } }
      );

      await Landowner.updateOne(
        { _id: contract.landownerId, 'interestedFarmers.farmerId': contract.farmerId },
        { $set: { 'interestedFarmers.$.contractStatus': 'active' } }
      );
    }

    await contract.save();

    // Emit socket event
    try {
      const io = getIO();
      if (io) {
        const farmer = await Farmer.findById(contract.farmerId);
        const landowner = await Landowner.findById(contract.landownerId);
        if (farmer) io.to(`user_${farmer.userId}`).emit('landownerContract:approved', { contract });
        if (landowner) io.to(`user_${landowner.userId}`).emit('landownerContract:approved', { contract });
      }
    } catch (e) {}

    res.json({ message: 'Contract approved successfully', contract });
  } catch (error) {
    console.error('Approve landowner contract error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get contracts for farmer
router.get('/farmer/:farmerId', async (req, res) => {
  try {
    const contracts = await LandownerContract.find({ farmerId: req.params.farmerId })
      .populate('landownerId', 'name companyName contactInfo')
      .sort({ createdAt: -1 });
    
    res.json({ contracts });
  } catch (error) {
    console.error('Get farmer contracts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get contracts for landowner
router.get('/landowner/:landownerId', async (req, res) => {
  try {
    const contracts = await LandownerContract.find({ landownerId: req.params.landownerId })
      .populate('farmerId', 'name companyName contactInfo farmDetails')
      .sort({ createdAt: -1 });
    
    res.json({ contracts });
  } catch (error) {
    console.error('Get landowner contracts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get contract by ID
router.get('/:id', async (req, res) => {
  try {
    const contract = await LandownerContract.findById(req.params.id)
      .populate('farmerId', 'name companyName contactInfo farmDetails')
      .populate('landownerId', 'name companyName contactInfo landDetails');
    
    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }
    
    res.json({ contract });
  } catch (error) {
    console.error('Get contract error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Download contract file by ID
router.get('/:id/download', auth, async (req, res) => {
  try {
    const contract = await LandownerContract.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }
    const filePath = contract?.contractFile?.path;
    if (!filePath) {
      return res.status(404).json({ message: 'No file associated with this contract' });
    }
    const absolutePath = path.join(__dirname, '..', filePath.startsWith('/') ? filePath.substring(1) : filePath);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }
    return res.download(absolutePath, path.basename(absolutePath));
  } catch (error) {
    console.error('Download landowner contract error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit progress update
router.post('/:id/progress', auth, upload.array('images', 5), async (req, res) => {
  try {
    const { step, description, status } = req.body;
    
    if (!step || !description) {
      return res.status(400).json({ message: 'Step and description are required' });
    }

    const contract = await LandownerContract.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }

    // Check if user is authorized (farmer or landowner)
    const userRole = req.user.role;
    let isAuthorized = false;

    if (userRole === 'farmer') {
      // For farmers, check if they are the farmer in the contract
      const farmer = await Farmer.findOne({ userId: req.user.userId });
      if (farmer && farmer._id.toString() === contract.farmerId.toString()) {
        isAuthorized = true;
      }
    } else if (userRole === 'landowner') {
      // For landowners, check if they are the landowner in the contract
      const landowner = await Landowner.findOne({ userId: req.user.userId });
      if (landowner && landowner._id.toString() === contract.landownerId.toString()) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized to update this contract' });
    }

    // Check if contract is active
    if (contract.status !== 'Active') {
      return res.status(400).json({ message: 'Progress updates can only be submitted for active contracts' });
    }

    // Create progress update
    const progressUpdate = {
      step,
      description,
      status: status || 'In Progress',
      images: req.files ? req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        path: `/uploads/landowner-contracts/${file.filename}`
      })) : []
    };

    contract.progressUpdates.push(progressUpdate);
    await contract.save();

    // Emit socket event
    try {
      const io = getIO();
      if (io) {
        const farmer = await Farmer.findById(contract.farmerId);
        const landowner = await Landowner.findById(contract.landownerId);
        if (farmer) io.to(`user_${farmer.userId}`).emit('landownerContract:progressUpdate', { contract, update: progressUpdate });
        if (landowner) io.to(`user_${landowner.userId}`).emit('landownerContract:progressUpdate', { contract, update: progressUpdate });
      }
    } catch (e) {}

    res.json({ message: 'Progress update submitted successfully', update: progressUpdate });
  } catch (error) {
    console.error('Submit progress update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Complete contract
router.post('/:id/complete', auth, async (req, res) => {
  try {
    const contract = await LandownerContract.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }

    // Check if user is authorized (farmer or landowner)
    const userRole = req.user.role;
    let isAuthorized = false;

    if (userRole === 'farmer') {
      // For farmers, check if they are the farmer in the contract
      const farmer = await Farmer.findOne({ userId: req.user.userId });
      if (farmer && farmer._id.toString() === contract.farmerId.toString()) {
        isAuthorized = true;
      }
    } else if (userRole === 'landowner') {
      // For landowners, check if they are the landowner in the contract
      const landowner = await Landowner.findOne({ userId: req.user.userId });
      if (landowner && landowner._id.toString() === contract.landownerId.toString()) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized to complete this contract' });
    }

    // Check if contract is active
    if (contract.status !== 'Active') {
      return res.status(400).json({ message: 'Only active contracts can be completed' });
    }

    contract.status = 'Completed';
    await contract.save();

    // Update contract status in both profiles
    await Farmer.updateOne(
      { _id: contract.farmerId, 'interestedLandowners.landownerId': contract.landownerId },
      { $set: { 'interestedLandowners.$.contractStatus': 'completed' } }
    );

    await Landowner.updateOne(
      { _id: contract.landownerId, 'interestedFarmers.farmerId': contract.farmerId },
      { $set: { 'interestedFarmers.$.contractStatus': 'completed' } }
    );

    // Emit socket event
    try {
      const io = getIO();
      if (io) {
        const farmer = await Farmer.findById(contract.farmerId);
        const landowner = await Landowner.findById(contract.landownerId);
        if (farmer) io.to(`user_${farmer.userId}`).emit('landownerContract:completed', { contract });
        if (landowner) io.to(`user_${landowner.userId}`).emit('landownerContract:completed', { contract });
      }
    } catch (e) {}

    res.json({ message: 'Contract completed successfully', contract });
  } catch (error) {
    console.error('Complete contract error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
