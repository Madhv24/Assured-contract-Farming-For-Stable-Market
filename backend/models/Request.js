const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
	senderUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
	senderRole: { type: String, enum: ['landowner', 'farmer', 'buyer'], required: true },
	senderProfileId: { type: mongoose.Schema.Types.ObjectId, required: true },
	receiverUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
	receiverRole: { type: String, enum: ['landowner', 'farmer', 'buyer'], required: true },
	receiverProfileId: { type: mongoose.Schema.Types.ObjectId, required: true },
	status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
	createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Request', requestSchema);


