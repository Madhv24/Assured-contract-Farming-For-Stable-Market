const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const Buyer = require('../models/Buyer');
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
    if (decoded.role !== 'buyer') {
      return res.status(403).json({ message: 'Access denied. Buyer role required.' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token.' });
  }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/buyers');
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

// Public: get full buyer by id (for farmer viewing buyer profile)
router.get('/public/:id', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }
    jwt.verify(token, JWT_SECRET);
    const buyer = await Buyer.findById(req.params.id).populate('userId', 'email');
    if (!buyer) return res.status(404).json({ message: 'Buyer not found' });
    res.json({ buyer });
  } catch (error) {
    console.error('Get public buyer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get buyer profile
router.get('/profile', auth, async (req, res) => {
  try {
    let buyer = await Buyer.findOne({ userId: req.user.userId })
      .populate('interestedFarmers.farmerId', 'name companyName contactInfo farmDetails cropDetails');
    
    // Auto-create empty profile if missing
    if (!buyer) {
      buyer = new Buyer({ userId: req.user.userId });
      await buyer.save();
    }

    res.json({ buyer });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update buyer profile
router.put('/profile', auth, async (req, res) => {
  try {
    const {
      name,
      companyName,
      contactInfo,
      cropRequirements,
      preferredArea,
      preferredRegion,
      priceRange
    } = req.body;

    const buyer = await Buyer.findOne({ userId: req.user.userId });
    if (!buyer) {
      return res.status(404).json({ message: 'Buyer profile not found' });
    }

    // Update fields
    if (name) buyer.name = name;
    if (companyName) buyer.companyName = companyName;
    if (contactInfo) buyer.contactInfo = contactInfo;
    if (cropRequirements) buyer.cropRequirements = cropRequirements;
    if (preferredArea) buyer.preferredArea = preferredArea;
    if (preferredRegion) buyer.preferredRegion = preferredRegion;
    if (priceRange) buyer.priceRange = priceRange;

    await buyer.save();

    res.json({ message: 'Profile updated successfully', buyer });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload requirement documents
router.post('/upload-docs', auth, upload.array('documents', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const buyer = await Buyer.findOne({ userId: req.user.userId });
    if (!buyer) {
      return res.status(404).json({ message: 'Buyer profile not found' });
    }

    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: `/uploads/buyers/${file.filename}`
    }));

    buyer.requirementDocs.push(...uploadedFiles);
    await buyer.save();

    res.json({ 
      message: 'Requirement documents uploaded successfully', 
      uploadedFiles 
    });
  } catch (error) {
    console.error('Upload documents error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload buyer images
router.post('/upload-images', auth, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images uploaded' });
    }

    const buyer = await Buyer.findOne({ userId: req.user.userId });
    if (!buyer) {
      return res.status(404).json({ message: 'Buyer profile not found' });
    }

    const uploadedImages = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: `/uploads/buyers/${file.filename}`
    }));

    buyer.images = buyer.images || [];
    buyer.images.push(...uploadedImages);
    await buyer.save();

    res.json({ message: 'Images uploaded successfully', uploadedImages });
  } catch (error) {
    console.error('Upload images error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Show interest in farmer's services
router.post('/interest-in-farmer/:farmerId', auth, async (req, res) => {
  try {
    const { farmerId } = req.params;

    const buyer = await Buyer.findOne({ userId: req.user.userId });
    if (!buyer) {
      return res.status(404).json({ message: 'Buyer profile not found' });
    }

    const farmer = await Farmer.findById(farmerId);
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    // Check if already interested
    const existingInterest = buyer.interestedFarmers.find(
      item => item.farmerId.toString() === farmerId
    );

    if (existingInterest) {
      return res.status(400).json({ message: 'Already interested in this farmer' });
    }

    // Add interest
    buyer.interestedFarmers.push({ farmerId });
    await buyer.save();

    // Add buyer to farmer's interested buyers list
    farmer.interestedBuyers.push({ buyerId: buyer._id });
    await farmer.save();

    // Emit real-time update to farmer
    try {
      const io = getIO();
      if (io) {
        io.to(farmerId).emit('buyerInterest', {
          buyerId: buyer._id,
          farmerId: farmerId
        });
      }
    } catch (e) {
      // noop if socket not ready
    }

    res.json({ message: 'Interest registered successfully' });
  } catch (error) {
    console.error('Interest in farmer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all farmers (with availability/status and media info)
router.get('/available-farmers', auth, async (req, res) => {
  try {
    const farmers = await Farmer.find({})
      .select('name companyName contactInfo farmDetails cropDetails climateSuitability resourceAvailability isAvailable status images contractPapers')
      .populate('userId', 'email');
    
    res.json({ farmers });
  } catch (error) {
    console.error('Get available farmers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get interested farmers
router.get('/interested-farmers', auth, async (req, res) => {
  try {
    const buyer = await Buyer.findOne({ userId: req.user.userId })
      .populate({
        path: 'interestedFarmers.farmerId',
        select: 'name companyName contactInfo farmDetails cropDetails userId',
        populate: { path: 'userId', select: 'email' }
      });
    
    if (!buyer) {
      return res.status(404).json({ message: 'Buyer profile not found' });
    }

    res.json({ interestedFarmers: buyer.interestedFarmers });
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

    const buyer = await Buyer.findOne({ userId: req.user.userId });
    if (!buyer) {
      return res.status(404).json({ message: 'Buyer profile not found' });
    }

    const interest = buyer.interestedFarmers.find(
      item => item.farmerId.toString() === farmerId
    );

    if (!interest) {
      return res.status(404).json({ message: 'Farmer interest not found' });
    }

    interest.status = status;

    // Mirror status in farmer's interestedBuyers
    const farmer = await Farmer.findById(farmerId);
    if (farmer) {
      const fb = farmer.interestedBuyers.find(
        item => item.buyerId?.toString() === buyer._id.toString()
      );
      if (fb) {
        fb.status = status;
      }
    }

    // If accepted, mark both as not available
    if (status === 'accepted') {
      buyer.isAvailable = false;
      buyer.status = 'Not Available';
      if (farmer) {
        farmer.isAvailable = false;
        farmer.status = 'Not Available';
        farmer.matchedBuyer = buyer._id;
      }
      buyer.matchedFarmer = farmer?._id;
    }

    await buyer.save();
    if (farmer) {
      await farmer.save();
    }

    // Emit real-time availability updates
    try {
      const io = getIO();
      if (io && status === 'accepted') {
        io.emit('availability:update', {
          entity: 'buyer',
          id: buyer._id.toString(),
          isAvailable: buyer.isAvailable
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

// Get all buyers for farmers to browse (include status/media)
router.get('/all-buyers', async (req, res) => {
  try {
    const buyers = await Buyer.find({})
      .select('name companyName cropRequirements preferredArea preferredRegion priceRange contactInfo isAvailable status images requirementDocs')
      .populate('userId', 'email');
    
    res.json({ buyers });
  } catch (error) {
    console.error('Get all buyers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get interested buyers
router.get('/interested-buyers', auth, async (req, res) => {
  try {
    const buyer = await Buyer.findOne({ userId: req.user.userId })
      .populate({
        path: 'interestedBuyers.buyerId',
        select: 'name companyName contactInfo cropRequirements priceRange userId',
        populate: { path: 'userId', select: 'email' }
      });
    
    if (!buyer) {
      return res.status(404).json({ message: 'Buyer profile not found' });
    }

    res.json({ interestedBuyers: buyer.interestedBuyers });
  } catch (error) {
    console.error('Get interested buyers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update buyer interest status
router.put('/buyer-interest/:buyerId', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const { buyerId } = req.params;

    if (!['pending', 'accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const buyer = await Buyer.findOne({ userId: req.user.userId });
    if (!buyer) {
      return res.status(404).json({ message: 'Buyer profile not found' });
    }

    const interest = buyer.interestedBuyers.find(
      item => item.buyerId.toString() === buyerId
    );

    if (!interest) {
      return res.status(404).json({ message: 'Buyer interest not found' });
    }

    interest.status = status;

    // Mirror status in buyer's interestedFarmers
    const farmer = await Farmer.findById(buyerId);
    if (farmer) {
      const fb = farmer.interestedBuyers.find(
        item => item.buyerId?.toString() === buyer._id.toString()
      );
      if (fb) {
        fb.status = status;
      }
    }

    // If accepted, mark both as not available
    if (status === 'accepted') {
      buyer.isAvailable = false;
      if (farmer) {
        farmer.isAvailable = false;
      }
    }

    await buyer.save();
    if (farmer) {
      await farmer.save();
    }

    // Emit real-time availability updates
    try {
      const io = getIO();
      if (io && status === 'accepted') {
        io.emit('availability:update', {
          entity: 'buyer',
          id: buyer._id.toString(),
          isAvailable: buyer.isAvailable
        });
        io.emit('availability:update', {
          entity: 'farmer',
          id: buyerId,
          isAvailable: false
        });
      }
    } catch (e) {
      // noop if socket not ready
    }

    res.json({ message: 'Buyer interest status updated successfully' });
  } catch (error) {
    console.error('Update buyer interest error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete uploaded files
router.delete('/files/:filename', auth, async (req, res) => {
  try {
    const { filename } = req.params;

    const buyer = await Buyer.findOne({ userId: req.user.userId });
    if (!buyer) {
      return res.status(404).json({ message: 'Buyer profile not found' });
    }

    const fileIndex = buyer.requirementDocs.findIndex(file => file.filename === filename);
    if (fileIndex === -1) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Remove file from filesystem
    const filePath = path.join(__dirname, '../uploads/buyers', filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove file from database
    buyer.requirementDocs.splice(fileIndex, 1);
    await buyer.save();

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
