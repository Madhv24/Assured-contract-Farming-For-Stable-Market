const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const Farmer = require('../models/Farmer');
const Landowner = require('../models/Landowner');
const Buyer = require('../models/Buyer');
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
    if (decoded.role !== 'farmer') {
      return res.status(403).json({ message: 'Access denied. Farmer role required.' });
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
    const uploadDir = path.join(__dirname, '../uploads/farmers');
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

// Public: get full farmer by id
router.get('/public/:id', anyAuth, async (req, res) => {
  try {
    const farmer = await Farmer.findById(req.params.id)
      .populate('userId', 'email');
    if (!farmer) return res.status(404).json({ message: 'Farmer not found' });
    res.json({ farmer });
  } catch (error) {
    console.error('Get public farmer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get farmer profile
router.get('/profile', auth, async (req, res) => {
  try {
    let farmer = await Farmer.findOne({ userId: req.user.userId })
      .populate({
        path: 'interestedLandowners.landownerId',
        select: 'name contactInfo landDetails availableCrops userId',
        populate: { path: 'userId', select: 'email' }
      })
      .populate({
        path: 'interestedBuyers.buyerId',
        select: 'name companyName contactInfo cropRequirements priceRange userId',
        populate: { path: 'userId', select: 'email' }
      });
    
    // Auto-create empty profile if missing
    if (!farmer) {
      farmer = new Farmer({ userId: req.user.userId });
      await farmer.save();
    }

    res.json({ farmer });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update farmer profile
router.put('/profile', auth, async (req, res) => {
  try {
    const {
      name,
      companyName,
      contactInfo,
      farmDetails,
      cropDetails,
      climateSuitability,
      resourceAvailability
    } = req.body;

    const farmer = await Farmer.findOne({ userId: req.user.userId });
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer profile not found' });
    }

    // Update fields
    if (name) farmer.name = name;
    if (companyName) farmer.companyName = companyName;
    if (contactInfo) farmer.contactInfo = contactInfo;
    if (farmDetails) farmer.farmDetails = farmDetails;
    if (cropDetails) farmer.cropDetails = cropDetails;
    if (climateSuitability) farmer.climateSuitability = climateSuitability;
    if (resourceAvailability) farmer.resourceAvailability = resourceAvailability;

    await farmer.save();

    res.json({ message: 'Profile updated successfully', farmer });
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

    const farmer = await Farmer.findOne({ userId: req.user.userId });
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer profile not found' });
    }

    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: `/uploads/farmers/${file.filename}`
    }));

    farmer.contractPapers.push(...uploadedFiles);
    await farmer.save();

    res.json({ 
      message: 'Contract papers uploaded successfully', 
      uploadedFiles 
    });
  } catch (error) {
    console.error('Upload contracts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload farmer images
router.post('/upload-images', auth, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images uploaded' });
    }

    const farmer = await Farmer.findOne({ userId: req.user.userId });
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer profile not found' });
    }

    const uploadedImages = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: `/uploads/farmers/${file.filename}`
    }));

    farmer.images = farmer.images || [];
    farmer.images.push(...uploadedImages);
    await farmer.save();

    res.json({ message: 'Images uploaded successfully', uploadedImages });
  } catch (error) {
    console.error('Upload images error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Show interest in landowner's land
router.post('/interest-in-land/:landownerId', auth, async (req, res) => {
  try {
    const { landownerId } = req.params;

    const farmer = await Farmer.findOne({ userId: req.user.userId });
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer profile not found' });
    }

    const landowner = await Landowner.findById(landownerId);
    if (!landowner) {
      return res.status(404).json({ message: 'Landowner not found' });
    }

    // Check if already interested
    const existingInterest = farmer.interestedLandowners.find(
      item => item.landownerId.toString() === landownerId
    );

    if (existingInterest) {
      return res.status(400).json({ message: 'Already interested in this land' });
    }

    // Add interest
    farmer.interestedLandowners.push({ landownerId });
    await farmer.save();

    // Add farmer to landowner's interested farmers list
    landowner.interestedFarmers.push({ farmerId: farmer._id });
    await landowner.save();

    res.json({ message: 'Interest registered successfully' });
  } catch (error) {
    console.error('Interest in land error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Show interest in buyer's requirements
router.post('/interest-in-buyer/:buyerId', auth, async (req, res) => {
  try {
    const { buyerId } = req.params;

    const farmer = await Farmer.findOne({ userId: req.user.userId });
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer profile not found' });
    }

    const buyer = await Buyer.findById(buyerId);
    if (!buyer) {
      return res.status(404).json({ message: 'Buyer not found' });
    }

    // Check if already interested
    const existingInterest = farmer.interestedBuyers.find(
      item => item.buyerId.toString() === buyerId
    );

    if (existingInterest) {
      return res.status(400).json({ message: 'Already interested in this buyer' });
    }

    // Add interest
    farmer.interestedBuyers.push({ buyerId });
    await farmer.save();

    // Add farmer to buyer's interested farmers list
    buyer.interestedFarmers.push({ farmerId: farmer._id });
    await buyer.save();

    // Emit real-time update to buyer
    try {
      const io = getIO();
      if (io) {
        io.to(buyerId).emit('farmerInterest', {
          farmerId: farmer._id,
          buyerId: buyerId
        });
      }
    } catch (e) {
      // noop if socket not ready
    }

    res.json({ message: 'Interest registered successfully' });
  } catch (error) {
    console.error('Interest in buyer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get available lands
router.get('/available-lands', auth, async (req, res) => {
  try {
    // Exclude lands where the farmer has already expressed interest
    const farmer = await Farmer.findOne({ userId: req.user.userId });
    const excludedLandownerIds = (farmer?.interestedLandowners || []).map(i => i.landownerId);

    const lands = await Landowner.find({ isAvailable: true, _id: { $nin: excludedLandownerIds } })
      .select('name landDetails availableCrops contactInfo userId')
      .populate('userId', 'email');

    res.json({ lands });
  } catch (error) {
    console.error('Get available lands error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get interested buyers
router.get('/interested-buyers', auth, async (req, res) => {
  try {
    const farmer = await Farmer.findOne({ userId: req.user.userId })
      .populate({
        path: 'interestedBuyers.buyerId',
        select: 'name companyName contactInfo cropRequirements priceRange userId',
        populate: { path: 'userId', select: 'email' }
      });
    
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer profile not found' });
    }

    res.json({ interestedBuyers: farmer.interestedBuyers });
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

    const farmer = await Farmer.findOne({ userId: req.user.userId });
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer profile not found' });
    }

    const interest = farmer.interestedBuyers.find(
      item => item.buyerId.toString() === buyerId
    );

    if (!interest) {
      return res.status(404).json({ message: 'Buyer interest not found' });
    }

    interest.status = status;
    // Mirror status in buyer's interestedFarmers
    const buyer = await Buyer.findById(buyerId);
    if (buyer) {
      const bf = buyer.interestedFarmers.find(
        item => item.farmerId?.toString() === farmer._id.toString()
      );
      if (bf) {
        bf.status = status;
      }
    }

    // If accepted, mark both as not available
    if (status === 'accepted') {
      farmer.isAvailable = false;
      farmer.status = 'Not Available';
      if (buyer) {
        buyer.isAvailable = false;
        buyer.status = 'Not Available';
      }
      // matched refs
      if (buyer) {
        farmer.matchedBuyer = buyer._id;
        buyer.matchedFarmer = farmer._id;
      }
    }

    await farmer.save();
    if (buyer) {
      await buyer.save();
    }

    // Emit real-time availability updates
    try {
      const io = getIO();
      if (io && status === 'accepted') {
        io.emit('availability:update', {
          entity: 'farmer',
          id: farmer._id.toString(),
          isAvailable: farmer.isAvailable
        });
        io.emit('availability:update', {
          entity: 'buyer',
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

// Update landowner interest status (farmer accepts/rejects landowner)
router.put('/land-interest/:landownerId', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const { landownerId } = req.params;

    if (!['pending', 'accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const farmer = await Farmer.findOne({ userId: req.user.userId });
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer profile not found' });
    }

    const interest = farmer.interestedLandowners.find(
      item => item.landownerId.toString() === landownerId
    );

    if (!interest) {
      return res.status(404).json({ message: 'Landowner interest not found' });
    }

    interest.status = status;

    // Mirror status in landowner's interestedFarmers
    const landowner = await Landowner.findById(landownerId);
    if (landowner) {
      const lf = landowner.interestedFarmers.find(
        item => item.farmerId?.toString() === farmer._id.toString()
      );
      if (lf) {
        lf.status = status;
      }
    }

    // If accepted, mark both as not available
    if (status === 'accepted') {
      farmer.isAvailable = false;
      farmer.status = 'Not Available';
      if (landowner) {
        landowner.isAvailable = false;
        landowner.status = 'Not Available';
      }
      if (landowner) {
        farmer.matchedLandowner = landowner._id;
        landowner.matchedFarmer = farmer._id;
      }
    }

    await farmer.save();
    if (landowner) {
      await landowner.save();
    }

    // Emit real-time availability updates
    try {
      const io = getIO();
      if (io && status === 'accepted') {
        io.emit('availability:update', {
          entity: 'farmer',
          id: farmer._id.toString(),
          isAvailable: farmer.isAvailable
        });
        io.emit('availability:update', {
          entity: 'landowner',
          id: landownerId,
          isAvailable: false
        });
      }
    } catch (e) {
      // noop if socket not ready
    }

    res.json({ message: 'Landowner interest status updated successfully' });
  } catch (error) {
    console.error('Update landowner interest error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all farmers for buyers to browse (include status/media)
router.get('/all-farmers', async (req, res) => {
  try {
    const farmers = await Farmer.find({})
      .select('name companyName farmDetails cropDetails climateSuitability resourceAvailability contactInfo isAvailable status images contractPapers')
      .populate('userId', 'email');
    
    res.json({ farmers });
  } catch (error) {
    console.error('Get all farmers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete uploaded files
router.delete('/files/:filename', auth, async (req, res) => {
  try {
    const { filename } = req.params;

    const farmer = await Farmer.findOne({ userId: req.user.userId });
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer profile not found' });
    }

    const fileIndex = farmer.contractPapers.findIndex(file => file.filename === filename);
    if (fileIndex === -1) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Remove file from filesystem
    const filePath = path.join(__dirname, '../uploads/farmers', filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove file from database
    farmer.contractPapers.splice(fileIndex, 1);
    await farmer.save();

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
