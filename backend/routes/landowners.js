const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const Landowner = require('../models/Landowner');
const Farmer = require('../models/Farmer');
const { getIO } = require('../socket');

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
    if (decoded.role !== 'landowner') {
      return res.status(403).json({ message: 'Access denied. Landowner role required.' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token.' });
  }
};

// Lightweight auth for public reads (any logged-in user)
const anyAuth = async (req, res, next) => {
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
    const uploadDir = path.join(__dirname, '../uploads/landowners');
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

// Get landowner profile
router.get('/profile', auth, async (req, res) => {
  try {
    let landowner = await Landowner.findOne({ userId: req.user.userId })
      .populate({
        path: 'interestedFarmers.farmerId',
        select: 'name companyName contactInfo farmDetails cropDetails userId',
        populate: { path: 'userId', select: 'email' }
      });
    
    // Auto-create empty profile if missing
    if (!landowner) {
      landowner = new Landowner({ userId: req.user.userId });
      await landowner.save();
    }

    res.json({ landowner });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Public: get full landowner by id
router.get('/public/:id', anyAuth, async (req, res) => {
  try {
    const landowner = await Landowner.findById(req.params.id)
      .populate('userId', 'email');
    if (!landowner) return res.status(404).json({ message: 'Landowner not found' });
    res.json({ landowner });
  } catch (error) {
    console.error('Get public landowner error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update landowner profile
router.put('/profile', auth, async (req, res) => {
  try {
    const {
      name,
      contactInfo,
      landDetails,
      availableCrops
    } = req.body;

    const landowner = await Landowner.findOne({ userId: req.user.userId });
    if (!landowner) {
      return res.status(404).json({ message: 'Landowner profile not found' });
    }

    // Update fields
    if (name) landowner.name = name;
    if (contactInfo) landowner.contactInfo = contactInfo;
    if (landDetails) landowner.landDetails = landDetails;
    if (availableCrops) landowner.availableCrops = availableCrops;

    await landowner.save();

    res.json({ message: 'Profile updated successfully', landowner });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload contract papers
router.post('/upload-contracts', auth, upload.array('contracts', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const landowner = await Landowner.findOne({ userId: req.user.userId });
    if (!landowner) {
      return res.status(404).json({ message: 'Landowner profile not found' });
    }

    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: `/uploads/landowners/${file.filename}`
    }));

    landowner.contractPapers.push(...uploadedFiles);
    await landowner.save();

    res.json({ 
      message: 'Contract papers uploaded successfully', 
      uploadedFiles 
    });
  } catch (error) {
    console.error('Upload contracts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload land images
router.post('/upload-images', auth, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images uploaded' });
    }

    const landowner = await Landowner.findOne({ userId: req.user.userId });
    if (!landowner) {
      return res.status(404).json({ message: 'Landowner profile not found' });
    }

    const uploadedImages = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: `/uploads/landowners/${file.filename}`
    }));

    landowner.landImages.push(...uploadedImages);
    await landowner.save();

    res.json({ 
      message: 'Land images uploaded successfully', 
      uploadedImages 
    });
  } catch (error) {
    console.error('Upload images error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all available farmers for landowners to browse
router.get('/available-farmers', async (req, res) => {
  try {
    const farmers = await Farmer.find({ isAvailable: true })
      .select('name companyName contactInfo farmDetails cropDetails climateSuitability resourceAvailability')
      .populate('userId', 'email');
    
    res.json({ farmers });
  } catch (error) {
    console.error('Get available farmers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Show interest in farmer's services
router.post('/interest-in-farmer/:farmerId', auth, async (req, res) => {
  try {
    const { farmerId } = req.params;

    const landowner = await Landowner.findOne({ userId: req.user.userId });
    if (!landowner) {
      return res.status(404).json({ message: 'Landowner profile not found' });
    }

    const farmer = await Farmer.findById(farmerId);
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    // Check if already interested
    const existingInterest = landowner.interestedFarmers.find(
      item => item.farmerId.toString() === farmerId
    );

    if (existingInterest) {
      return res.status(400).json({ message: 'Already interested in this farmer' });
    }

    // Add interest
    landowner.interestedFarmers.push({ farmerId });
    await landowner.save();

    // Add landowner to farmer's interested landowners list
    farmer.interestedLandowners.push({ landownerId: landowner._id });
    await farmer.save();

    res.json({ message: 'Interest registered successfully' });
  } catch (error) {
    console.error('Interest in farmer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get interested farmers
router.get('/interested-farmers', auth, async (req, res) => {
  try {
    const landowner = await Landowner.findOne({ userId: req.user.userId })
      .populate({
        path: 'interestedFarmers.farmerId',
        select: 'name companyName contactInfo farmDetails cropDetails userId',
        populate: { path: 'userId', select: 'email' }
      });
    
    if (!landowner) {
      return res.status(404).json({ message: 'Landowner profile not found' });
    }

    res.json({ interestedFarmers: landowner.interestedFarmers });
  } catch (error) {
    console.error('Get interested farmers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update farmer interest status
router.put('/farmer-interest/:farmerId', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const { farmerId } = req.params;

    if (!['pending', 'accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const landowner = await Landowner.findOne({ userId: req.user.userId });
    if (!landowner) {
      return res.status(404).json({ message: 'Landowner profile not found' });
    }

    const interest = landowner.interestedFarmers.find(
      item => item.farmerId.toString() === farmerId
    );

    if (!interest) {
      return res.status(404).json({ message: 'Farmer interest not found' });
    }

    interest.status = status;
    await landowner.save();

    // Mirror status in farmer's interestedLandowners
    const farmer = await Farmer.findById(farmerId);
    if (farmer) {
      const fl = farmer.interestedLandowners.find(
        item => item.landownerId?.toString() === landowner._id.toString()
      );
      if (fl) {
        fl.status = status;
        // If accepted, mark both as not available
        if (status === 'accepted') {
          farmer.isAvailable = false;
          landowner.isAvailable = false;
          farmer.status = 'Not Available';
          landowner.status = 'Not Available';
          // matched refs
          farmer.matchedLandowner = landowner._id;
          landowner.matchedFarmer = farmer._id;
          await landowner.save();
        }
        await farmer.save();
      }
    }

    // Emit real-time availability updates
    try {
      const io = getIO();
      if (io && status === 'accepted') {
        io.emit('availability:update', {
          entity: 'landowner',
          id: landowner._id.toString(),
          isAvailable: landowner.isAvailable
        });
        io.emit('availability:update', {
          entity: 'farmer',
          id: farmerId,
          isAvailable: false
        });
      }
    } catch (e) {
      // noop if socket not ready
    }

    res.json({ message: 'Farmer interest status updated successfully' });
  } catch (error) {
    console.error('Update farmer interest error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all available lands for farmers to browse
router.get('/available-lands', async (req, res) => {
  try {
    const lands = await Landowner.find({ isAvailable: true })
      .select('name landDetails availableCrops location area soilType climaticConditions')
      .populate('userId', 'email');
    
    res.json({ lands });
  } catch (error) {
    console.error('Get available lands error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete uploaded files
router.delete('/files/:fileType/:filename', auth, async (req, res) => {
  try {
    const { fileType, filename } = req.params;
    
    if (!['contractPapers', 'landImages'].includes(fileType)) {
      return res.status(400).json({ message: 'Invalid file type' });
    }

    const landowner = await Landowner.findOne({ userId: req.user.userId });
    if (!landowner) {
      return res.status(404).json({ message: 'Landowner profile not found' });
    }

    const fileIndex = landowner[fileType].findIndex(file => file.filename === filename);
    if (fileIndex === -1) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Remove file from filesystem
    const filePath = path.join(__dirname, '../uploads/landowners', filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove file from database
    landowner[fileType].splice(fileIndex, 1);
    await landowner.save();

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
