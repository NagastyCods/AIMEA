import mongoose from 'mongoose';

const emergencyHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  symptoms: {
    type: [String],
    default: []
  },
  location: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  aiResponse: {
    type: String,
    default: ''
  },
  userDescription: {
    type: String,
    default: ''
  },
  imageUrl: {
    type: String,
    default: null
  },
  severity: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  requestedAmbulance: {
    type: Boolean,
    default: false
  },
  emergencyTeamNotified: {
    type: Boolean,
    default: false
  },
  contactsNotified: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'EmergencyContact',
    default: []
  },
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('EmergencyHistory', emergencyHistorySchema);
