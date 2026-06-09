import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'ai'],
    required: true
  },
  text: {
    type: String,
    default: ''
  },
  imageUrl: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const chatHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    default: 'Chat session'
  },
  messages: {
    type: [chatMessageSchema],
    default: []
  }
}, {
  timestamps: true
});

export default mongoose.model('ChatHistory', chatHistorySchema);
