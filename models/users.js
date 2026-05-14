import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;

  // If the password looks like an already hashed bcrypt string, do not hash again.
  if (/^\$2[aby]\$.{56}$/.test(this.password)) return;

  this.password = await bcrypt.hash(this.password, 10);
});

export default mongoose.model('User', userSchema);