const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Request = require('../models/Request');
const Landowner = require('../models/Landowner');
const Farmer = require('../models/Farmer');
const Buyer = require('../models/Buyer');
const { getIO, emitAvailabilityUpdate, emitProfileStatusChanged } = require('../socket');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const auth = async (req, res, next) => {
	try {
		const token = req.header('Authorization')?.replace('Bearer ', '');
		if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });
		const decoded = jwt.verify(token, JWT_SECRET);
		req.user = decoded;
		next();
	} catch (e) {
		res.status(400).json({ message: 'Invalid token.' });
	}
};

function getModelByRole(role) {
	switch (role) {
		case 'landowner': return Landowner;
		case 'farmer': return Farmer;
		case 'buyer': return Buyer;
		default: return null;
	}
}

// POST /api/requests/send
// body: { receiverRole, receiverProfileId }
router.post('/send', auth, async (req, res) => {
	try {
		const senderRole = req.user.role;
		const senderUserId = req.user.userId;
		const senderModel = getModelByRole(senderRole);
		if (!senderModel) return res.status(400).json({ message: 'Invalid sender role' });

		const senderProfile = await senderModel.findOne({ userId: senderUserId });
		if (!senderProfile) return res.status(404).json({ message: 'Sender profile not found' });

		const { receiverRole, receiverProfileId } = req.body;
		const receiverModel = getModelByRole(receiverRole);
		if (!receiverModel) return res.status(400).json({ message: 'Invalid receiver role' });
		const receiverProfile = await receiverModel.findById(receiverProfileId);
		if (!receiverProfile) return res.status(404).json({ message: 'Receiver profile not found' });
		if (!receiverProfile.isAvailable) return res.status(400).json({ message: 'Receiver is not available' });

		const request = new Request({
			senderUserId,
			senderRole,
			senderProfileId: senderProfile._id,
			receiverUserId: receiverProfile.userId,
			receiverRole,
			receiverProfileId,
			status: 'pending'
		});
		await request.save();

		receiverProfile.requests.push({ requestId: request._id, fromRole: senderRole, fromProfileId: senderProfile._id, status: 'pending' });
		await receiverProfile.save();

		res.json({ message: 'Request sent', requestId: request._id });
	} catch (error) {
		console.error('Send request error:', error);
		res.status(500).json({ message: 'Server error' });
	}
});

// POST /api/requests/accept
// body: { requestId }
router.post('/accept', auth, async (req, res) => {
	try {
		const { requestId } = req.body;
		const request = await Request.findById(requestId);
		if (!request) return res.status(404).json({ message: 'Request not found' });
		if (String(request.receiverUserId) !== String(req.user.userId)) return res.status(403).json({ message: 'Not authorized to accept this request' });

		const senderModel = getModelByRole(request.senderRole);
		const receiverModel = getModelByRole(request.receiverRole);
		const senderProfile = await senderModel.findById(request.senderProfileId);
		const receiverProfile = await receiverModel.findById(request.receiverProfileId);
		if (!senderProfile || !receiverProfile) return res.status(404).json({ message: 'Profiles not found' });
		if (!senderProfile.isAvailable || !receiverProfile.isAvailable) return res.status(400).json({ message: 'One of the profiles is not available' });

		request.status = 'accepted';
		await request.save();

		// Update receiver record in requests array
		receiverProfile.requests = (receiverProfile.requests || []).map(r => {
			if (String(r.requestId) === String(request._id)) {
				r.status = 'accepted';
			}
			return r;
		});

		// Update availability and status strings
		senderProfile.isAvailable = false;
		receiverProfile.isAvailable = false;
		senderProfile.status = 'Not Available';
		receiverProfile.status = 'Not Available';

		// Set matched refs
		if (request.senderRole === 'farmer' && request.receiverRole === 'landowner') {
			senderProfile.matchedLandowner = receiverProfile._id;
			receiverProfile.matchedFarmer = senderProfile._id;
		}
		if (request.senderRole === 'landowner' && request.receiverRole === 'farmer') {
			receiverProfile.matchedLandowner = senderProfile._id;
			senderProfile.matchedFarmer = receiverProfile._id;
		}
		if (request.senderRole === 'farmer' && request.receiverRole === 'buyer') {
			senderProfile.matchedBuyer = receiverProfile._id;
			receiverProfile.matchedFarmer = senderProfile._id;
		}
		if (request.senderRole === 'buyer' && request.receiverRole === 'farmer') {
			receiverProfile.matchedBuyer = senderProfile._id;
			senderProfile.matchedFarmer = receiverProfile._id;
		}

		await senderProfile.save();
		await receiverProfile.save();

		// Emit socket events
		try {
			const io = getIO();
			if (io) {
				emitAvailabilityUpdate(request.senderRole, senderProfile._id.toString(), false);
				emitAvailabilityUpdate(request.receiverRole, receiverProfile._id.toString(), false);
				emitProfileStatusChanged(request.senderRole, senderProfile._id.toString(), senderProfile.status, senderProfile.isAvailable);
				emitProfileStatusChanged(request.receiverRole, receiverProfile._id.toString(), receiverProfile.status, receiverProfile.isAvailable);
			}
		} catch (e) {}

		res.json({ message: 'Request accepted' });
	} catch (error) {
		console.error('Accept request error:', error);
		res.status(500).json({ message: 'Server error' });
	}
});

// POST /api/requests/reject
// body: { requestId }
router.post('/reject', auth, async (req, res) => {
	try {
		const { requestId } = req.body;
		const request = await Request.findById(requestId);
		if (!request) return res.status(404).json({ message: 'Request not found' });
		if (String(request.receiverUserId) !== String(req.user.userId)) return res.status(403).json({ message: 'Not authorized to reject this request' });

		request.status = 'rejected';
		await request.save();

		const receiverModel = getModelByRole(request.receiverRole);
		const receiverProfile = await receiverModel.findById(request.receiverProfileId);
		if (receiverProfile) {
			receiverProfile.requests = (receiverProfile.requests || []).map(r => {
				if (String(r.requestId) === String(request._id)) r.status = 'rejected';
				return r;
			});
			await receiverProfile.save();
		}

		res.json({ message: 'Request rejected' });
	} catch (error) {
		console.error('Reject request error:', error);
		res.status(500).json({ message: 'Server error' });
	}
});

module.exports = router;
// Get incoming requests for the logged-in user, populated with sender profile
router.get('/incoming', auth, async (req, res) => {
  try {
    const { role, userId } = req.user;
    const requests = await Request.find({ receiverUserId: userId })
      .sort({ createdAt: -1 })
      .lean();

    const result = [];
    for (const r of requests) {
      const senderModel = getModelByRole(r.senderRole);
      const senderProfile = await senderModel.findById(r.senderProfileId).select('name companyName contactInfo').lean();
      result.push({ ...r, senderProfile });
    }

    res.json({ requests: result });
  } catch (error) {
    console.error('Incoming requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});




