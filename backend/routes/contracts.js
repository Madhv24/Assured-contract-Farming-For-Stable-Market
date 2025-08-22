const express = require('express');
const jwt = require('jsonwebtoken');
const Landowner = require('../models/Landowner');
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
