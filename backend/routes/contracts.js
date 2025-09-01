const express = require('express');
const jwt = require('jsonwebtoken');
const Landowner = require('../models/Landowner');
const Farmer = require('../models/Farmer');
const Buyer = require('../models/Buyer');
const Contract = require('../models/Contract');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

// Multer storage for signed contract files
const contractStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/contracts');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'contract-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const contractUpload = multer({
  storage: contractStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|doc|docx|jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const type = allowed.test(file.mimetype);
    if (ext && type) return cb(null, true);
    cb(new Error('Only PDF, DOC, DOCX, and image files are allowed'));
  }
});

// Create contract with signed file upload (legacy path retained)
router.post('/createContractWithUpload', auth, contractUpload.single('contractFile'), async (req, res) => {
  try {
    const { farmerId, buyerId, cropType, quantity, price, deliveryDate, title, description, agreementDate } = req.body;
    
    // Validate that IDs are provided
    if (!farmerId || !buyerId) {
      return res.status(400).json({ message: 'Farmer ID and Buyer ID are required' });
    }
    
    // Validate that IDs are valid ObjectIds
    if (!require('mongoose').Types.ObjectId.isValid(farmerId) || !require('mongoose').Types.ObjectId.isValid(buyerId)) {
      return res.status(400).json({ message: 'Invalid Farmer ID or Buyer ID format' });
    }
    
    console.log('Contract creation request:', {
      body: req.body,
      file: req.file,
      user: req.user
    });
    
    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({ message: 'Signed contract file is required' });
    }

    console.log('File uploaded successfully:', req.file);

    // Validate parties
    console.log('Looking up farmer with ID:', farmerId);
    console.log('Looking up buyer with ID:', buyerId);
    
    const farmer = await Farmer.findById(farmerId);
    const buyer = await Buyer.findById(buyerId);
    
    console.log('Found farmer:', farmer ? 'Yes' : 'No');
    console.log('Found buyer:', buyer ? 'Yes' : 'No');
    
    if (!farmer || !buyer) return res.status(404).json({ message: 'Farmer or Buyer not found' });

    // Check if there's any interest between the parties (more flexible validation)
    const farmerInterestedInBuyer = farmer.interestedBuyers?.some(i => i.buyerId?.toString() === buyerId);
    const buyerInterestedInFarmer = buyer.interestedFarmers?.some(i => i.farmerId?.toString() === farmerId);
    
    console.log('Contract creation validation:', {
      farmerId,
      buyerId,
      farmerInterestedBuyers: farmer.interestedBuyers,
      buyerInterestedFarmers: buyer.interestedFarmers,
      farmerInterestedInBuyer,
      buyerInterestedInFarmer
    });
    
    // For now, allow contract creation without strict interest validation (for testing)
    // TODO: Re-enable this validation once interest system is working properly
    /*
    if (!farmerInterestedInBuyer || !buyerInterestedInFarmer) {
      return res.status(400).json({ message: 'Both parties must show interest before creating a contract' });
    }
    */

    const contract = new Contract({
      title: title || undefined,
      description: description || undefined,
      farmerId: farmer._id,
      buyerId: buyer._id,
      cropName: cropType,
      quantity: Number(quantity),
      unit: 'kg',
      price: Number(price),
      priceUnit: 'per kg',
      expectedDeliveryDate: new Date(deliveryDate),
      contractFile: `/uploads/contracts/${req.file.filename}`,
      documentUrl: `/uploads/contracts/${req.file.filename}`,
      agreementDate: agreementDate ? new Date(agreementDate) : undefined,
      status: 'Pending',
      farmerApproved: false,
      buyerApproved: false,
      progressUpdates: [
        { step: 1, title: 'Contract signed with Buyer', status: 'Pending', notes: '' },
        { step: 2, title: 'Seeds purchased', status: 'Pending', notes: '' },
        { step: 3, title: 'Seeds planted in the field', status: 'Pending', notes: '' },
        { step: 4, title: 'Crop growth update (percentage grown / description)', status: 'Pending', notes: '' },
        { step: 5, title: 'Fertilizer requirement update (type & quantity needed)', status: 'Pending', notes: '' },
        { step: 6, title: 'Crop ready for harvesting', status: 'Pending', notes: '' },
        { step: 7, title: 'Crop ready for delivery', status: 'Pending', notes: '' }
      ]
    });

    await contract.save();

    // Update contract status in interested arrays
    await Farmer.updateOne(
      { _id: farmer._id, 'interestedBuyers.buyerId': buyer._id },
      { 
        $set: { 
          'interestedBuyers.$.contractStatus': 'pending',
          'interestedBuyers.$.contractId': contract._id
        }
      }
    );

    await Buyer.updateOne(
      { _id: buyer._id, 'interestedFarmers.farmerId': farmer._id },
      { 
        $set: { 
          'interestedFarmers.$.contractStatus': 'pending',
          'interestedFarmers.$.contractId': contract._id
        }
      }
    );

    // Emit contract created event
    try {
      const io = require('../socket').getIO();
      if (io) {
        io.to(`user_${farmer.userId}`).emit('contract:created', { contract });
        io.to(`user_${buyer.userId}`).emit('contract:created', { contract });
      }
    } catch (e) {
      // Socket not ready
    }

    res.status(201).json({ message: 'Contract created', contract });
  } catch (error) {
    console.error('Create contract with upload error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create contract (generic alias): POST /api/contracts
router.post('/', auth, contractUpload.single('contractFile'), async (req, res) => {
  try {
    const { farmerId, buyerId, cropType, quantity, price, deliveryDate, title, description, agreementDate } = req.body;
    if (!farmerId || !buyerId) {
      return res.status(400).json({ message: 'Farmer ID and Buyer ID are required' });
    }
    if (!require('mongoose').Types.ObjectId.isValid(farmerId) || !require('mongoose').Types.ObjectId.isValid(buyerId)) {
      return res.status(400).json({ message: 'Invalid Farmer ID or Buyer ID format' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Signed contract file is required' });
    }

    const farmer = await Farmer.findById(farmerId);
    const buyer = await Buyer.findById(buyerId);
    if (!farmer || !buyer) return res.status(404).json({ message: 'Farmer or Buyer not found' });

    const contract = new Contract({
      title: title || undefined,
      description: description || undefined,
      farmerId: farmer._id,
      buyerId: buyer._id,
      cropName: cropType,
      quantity: Number(quantity),
      unit: 'kg',
      price: Number(price),
      priceUnit: 'per kg',
      expectedDeliveryDate: new Date(deliveryDate),
      contractFile: `/uploads/contracts/${req.file.filename}`,
      documentUrl: `/uploads/contracts/${req.file.filename}`,
      agreementDate: agreementDate ? new Date(agreementDate) : undefined,
      status: 'Pending',
      farmerApproved: false,
      buyerApproved: false,
    });

    await contract.save();
    res.status(201).json({ message: 'Contract created', contract });
  } catch (error) {
    console.error('Create contract error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve contract by farmer or buyer; activate when both approved
router.post('/:id/approve', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const contract = await Contract.findById(id).populate('farmerId').populate('buyerId');
    if (!contract) return res.status(404).json({ message: 'Contract not found' });

    if (req.user.role === 'farmer') contract.farmerApproved = true;
    else if (req.user.role === 'buyer') contract.buyerApproved = true;
    else return res.status(403).json({ message: 'Only farmer or buyer can approve' });

    if (contract.farmerApproved && contract.buyerApproved) {
      contract.status = 'Active';
      
      // Update contract status in interested arrays to 'active'
      await Farmer.updateOne(
        { _id: contract.farmerId, 'interestedBuyers.contractId': contract._id },
        { $set: { 'interestedBuyers.$.contractStatus': 'active' } }
      );

      await Buyer.updateOne(
        { _id: contract.buyerId, 'interestedFarmers.contractId': contract._id },
        { $set: { 'interestedFarmers.$.contractStatus': 'active' } }
      );
    }

    await contract.save();
    res.json({ message: 'Approval recorded', contract });
  } catch (error) {
    console.error('Approve contract error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get contract by ID
router.get('/:contractId', auth, async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.contractId)
      .populate('farmerId', 'name companyName contactInfo farmDetails')
      .populate('buyerId', 'name companyName contactInfo cropRequirements priceRange');
    
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
router.get('/:contractId/download', auth, async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.contractId);
    if (!contract) return res.status(404).json({ message: 'Contract not found' });
    const filePath = contract.contractFile || contract.documentUrl;
    if (!filePath) return res.status(404).json({ message: 'No file associated with this contract' });
    const absolutePath = path.join(__dirname, '..', filePath.startsWith('/') ? filePath.substring(1) : filePath);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }
    return res.download(absolutePath, path.basename(absolutePath));
  } catch (error) {
    console.error('Download contract error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get contracts by farmer ID
router.get('/farmer/:farmerId', auth, async (req, res) => {
  try {
    const contracts = await Contract.find({ farmerId: req.params.farmerId })
      .populate('buyerId', 'name companyName contactInfo')
      .sort({ createdAt: -1 });
    
    res.json({ contracts });
  } catch (error) {
    console.error('Get farmer contracts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get contracts by buyer ID
router.get('/buyer/:buyerId', auth, async (req, res) => {
  try {
    const contracts = await Contract.find({ buyerId: req.params.buyerId })
      .populate('farmerId', 'name companyName contactInfo farmDetails')
      .sort({ createdAt: -1 });
    
    res.json({ contracts });
  } catch (error) {
    console.error('Get buyer contracts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// List contracts for user
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { role } = req.query;
    const { userId } = req.params;

    if (!['farmer', 'buyer'].includes(role)) {
      return res.status(400).json({ message: 'role must be farmer|buyer' });
    }

    let profile;
    if (role === 'farmer') profile = await Farmer.findOne({ userId });
    if (role === 'buyer') profile = await Buyer.findOne({ userId });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    const query = role === 'farmer' ? { farmerId: profile._id } : { buyerId: profile._id };
    const contracts = await Contract.find(query)
      .populate('farmerId', 'name contactInfo farmDetails')
      .populate('buyerId', 'name contactInfo cropRequirements priceRange');

    res.json({ contracts });
  } catch (error) {
    console.error('List user contracts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Complete contract
router.patch('/complete/:contractId', auth, async (req, res) => {
  try {
    const { contractId } = req.params;
    const contract = await Contract.findById(contractId);
    if (!contract) return res.status(404).json({ message: 'Contract not found' });
    contract.status = 'Completed';
    
    // Update contract status in interested arrays to 'completed'
    await Farmer.updateOne(
      { _id: contract.farmerId, 'interestedBuyers.contractId': contract._id },
      { $set: { 'interestedBuyers.$.contractStatus': 'completed' } }
    );

    await Buyer.updateOne(
      { _id: contract.buyerId, 'interestedFarmers.contractId': contract._id },
      { $set: { 'interestedFarmers.$.contractStatus': 'completed' } }
    );
    
    await contract.save();
    res.json({ message: 'Contract completed', contract });
  } catch (error) {
    console.error('Complete contract error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get contract overview for all roles
router.get('/overview', auth, async (req, res) => {
  try {
    const { role, userId } = req.user;
    let contracts = {};

    switch (role) {
      case 'landowner':
        const landowner = await Landowner.findOne({ userId })
          .populate('interestedFarmers.farmerId', 'name companyName contactInfo farmDetails cropDetails');
        contracts = {
          type: 'landowner',
          profile: landowner,
          interestedParties: landowner?.interestedFarmers || []
        };
        break;

      case 'farmer':
        const farmer = await Farmer.findOne({ userId })
          .populate('interestedLandowners.landownerId', 'name landDetails availableCrops')
          .populate('interestedBuyers.buyerId', 'name cropRequirements priceRange');
        contracts = {
          type: 'farmer',
          profile: farmer,
          interestedLandowners: farmer?.interestedLandowners || [],
          interestedBuyers: farmer?.interestedBuyers || []
        };
        break;

      case 'buyer':
        const buyer = await Buyer.findOne({ userId })
          .populate('interestedFarmers.farmerId', 'name companyName farmDetails cropDetails');
        contracts = {
          type: 'buyer',
          profile: buyer,
          interestedParties: buyer?.interestedFarmers || []
        };
        break;

      default:
        return res.status(400).json({ message: 'Invalid role' });
    }

    res.json({ contracts });
  } catch (error) {
    console.error('Get contract overview error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get available stakeholders for browsing
router.get('/stakeholders/:role', auth, async (req, res) => {
  try {
    const { role } = req.params;
    let stakeholders = {};

    switch (role) {
      case 'landowners':
        const landowners = await Landowner.find({ isAvailable: true })
          .select('name landDetails availableCrops location area soilType climaticConditions')
          .populate('userId', 'email');
        stakeholders = { landowners };
        break;

      case 'farmers':
        const farmers = await Farmer.find()
          .select('name companyName farmDetails cropDetails climateSuitability resourceAvailability')
          .populate('userId', 'email');
        stakeholders = { farmers };
        break;

      case 'buyers':
        const buyers = await Buyer.find()
          .select('name companyName cropRequirements preferredArea preferredRegion priceRange')
          .populate('userId', 'email');
        stakeholders = { buyers };
        break;

      default:
        return res.status(400).json({ message: 'Invalid stakeholder type' });
    }

    res.json(stakeholders);
  } catch (error) {
    console.error('Get stakeholders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get contract statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const { role, userId } = req.user;
    let stats = {};

    switch (role) {
      case 'landowner':
        const landowner = await Landowner.findOne({ userId });
        stats = {
          totalInterests: landowner?.interestedFarmers?.length || 0,
          pendingInterests: landowner?.interestedFarmers?.filter(i => i.status === 'pending').length || 0,
          acceptedInterests: landowner?.interestedFarmers?.filter(i => i.status === 'accepted').length || 0,
          rejectedInterests: landowner?.interestedFarmers?.filter(i => i.status === 'rejected').length || 0
        };
        break;

      case 'farmer':
        const farmer = await Farmer.findOne({ userId });
        stats = {
          landInterests: {
            total: farmer?.interestedLandowners?.length || 0,
            pending: farmer?.interestedLandowners?.filter(i => i.status === 'pending').length || 0,
            accepted: farmer?.interestedLandowners?.filter(i => i.status === 'accepted').length || 0,
            rejected: farmer?.interestedLandowners?.filter(i => i.status === 'rejected').length || 0
          },
          buyerInterests: {
            total: farmer?.interestedBuyers?.length || 0,
            pending: farmer?.interestedBuyers?.filter(i => i.status === 'pending').length || 0,
            accepted: farmer?.interestedBuyers?.filter(i => i.status === 'accepted').length || 0,
            rejected: farmer?.interestedBuyers?.filter(i => i.status === 'rejected').length || 0
          }
        };
        break;

      case 'buyer':
        const buyer = await Buyer.findOne({ userId });
        stats = {
          totalInterests: buyer?.interestedFarmers?.length || 0,
          pendingInterests: buyer?.interestedFarmers?.filter(i => i.status === 'pending').length || 0,
          acceptedInterests: buyer?.interestedFarmers?.filter(i => i.status === 'accepted').length || 0,
          rejectedInterests: buyer?.interestedFarmers?.filter(i => i.status === 'rejected').length || 0
        };
        break;

      default:
        return res.status(400).json({ message: 'Invalid role' });
    }

    res.json({ stats });
  } catch (error) {
    console.error('Get contract stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search stakeholders
router.get('/search', auth, async (req, res) => {
  try {
    const { query, type } = req.query;
    
    if (!query || !type) {
      return res.status(400).json({ message: 'Query and type are required' });
    }

    let results = [];

    switch (type) {
      case 'landowners':
        results = await Landowner.find({
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { 'landDetails.location': { $regex: query, $options: 'i' } },
            { 'landDetails.area': { $regex: query, $options: 'i' } },
            { availableCrops: { $in: [new RegExp(query, 'i')] } }
          ]
        }).select('name landDetails availableCrops location area').populate('userId', 'email');
        break;

      case 'farmers':
        results = await Farmer.find({
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { companyName: { $regex: query, $options: 'i' } },
            { 'farmDetails.location': { $regex: query, $options: 'i' } },
            { 'cropDetails.name': { $in: [new RegExp(query, 'i')] } }
          ]
        }).select('name companyName farmDetails cropDetails location').populate('userId', 'email');
        break;

      case 'buyers':
        results = await Buyer.find({
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { companyName: { $regex: query, $options: 'i' } },
            { preferredArea: { $regex: query, $options: 'i' } },
            { 'cropRequirements.cropName': { $in: [new RegExp(query, 'i')] } }
          ]
        }).select('name companyName cropRequirements preferredArea priceRange').populate('userId', 'email');
        break;

      default:
        return res.status(400).json({ message: 'Invalid search type' });
    }

    res.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get recent activities
router.get('/recent-activities', auth, async (req, res) => {
  try {
    const { role, userId } = req.user;
    let activities = [];

    switch (role) {
      case 'landowner':
        const landowner = await Landowner.findOne({ userId })
          .populate('interestedFarmers.farmerId', 'name companyName');
        if (landowner?.interestedFarmers) {
          activities = landowner.interestedFarmers
            .sort((a, b) => new Date(b.interestDate) - new Date(a.interestDate))
            .slice(0, 10)
            .map(item => ({
              type: 'farmer_interest',
              farmer: item.farmerId,
              date: item.interestDate,
              status: item.status
            }));
        }
        break;

      case 'farmer':
        const farmer = await Farmer.findOne({ userId })
          .populate('interestedLandowners.landownerId', 'name')
          .populate('interestedBuyers.buyerId', 'name companyName');
        
        if (farmer?.interestedLandowners) {
          const landActivities = farmer.interestedLandowners
            .sort((a, b) => new Date(b.interestDate) - new Date(a.interestDate))
            .slice(0, 5)
            .map(item => ({
              type: 'land_interest',
              landowner: item.landownerId,
              date: item.interestDate,
              status: item.status
            }));
          activities.push(...landActivities);
        }

        if (farmer?.interestedBuyers) {
          const buyerActivities = farmer.interestedBuyers
            .sort((a, b) => new Date(b.interestDate) - new Date(a.interestDate))
            .slice(0, 5)
            .map(item => ({
              type: 'buyer_interest',
              buyer: item.buyerId,
              date: item.interestDate,
              status: item.status
            }));
          activities.push(...buyerActivities);
        }

        activities.sort((a, b) => new Date(b.date) - new Date(a.date));
        activities = activities.slice(0, 10);
        break;

      case 'buyer':
        const buyer = await Buyer.findOne({ userId })
          .populate('interestedFarmers.farmerId', 'name companyName');
        if (buyer?.interestedFarmers) {
          activities = buyer.interestedFarmers
            .sort((a, b) => new Date(b.interestDate) - new Date(a.interestDate))
            .slice(0, 10)
            .map(item => ({
              type: 'farmer_interest',
              farmer: item.farmerId,
              date: item.interestDate,
              status: item.status
            }));
        }
        break;
    }

    res.json({ activities });
  } catch (error) {
    console.error('Get recent activities error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
