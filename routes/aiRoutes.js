import express from "express";
import multer from "multer";
import path from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from "../models/users.js";
import EmergencyContact from "../models/emergencyContact.js";
import EmergencyHistory from "../models/emergencyHistory.js";
import { aiMedicalAssistant } from "../controllers/aiController.js";
import { sendEmergencyAlert, sendTeamAlert } from "../config/emailService.js";

const router = express.Router();
const upload = multer({dest:"uploads/"});

const JWT_SECRET = process.env.JWT_SECRET || 'aimea_secret';

// middleware to verify JWT token
export const verifyToken = (req, res, next) => {
	const token = req.headers['authorization']?.split(' ')[1];
	if (!token) return res.status(401).json({message: 'No token provided.'});
	jwt.verify(token, JWT_SECRET, (err, decoded) => {
		if(err) return res.status(403).json({message: 'invalid token.'});
		req.user = decoded;
		next();
	})
}
// Register
router.post('/auth/register', async (req, res) => {
	try {
		const { username, email, password } = req.body;
		if (!username || !email || !password) return res.status(400).json({ message: 'All fields required.' });

		const existingUsername = await User.findOne({ username });
		if (existingUsername) return res.status(409).json({ message: 'Username already exists.' });

		const existingEmail = await User.findOne({ email });
		if (existingEmail) return res.status(409).json({ message: 'Email already in use.' });

		const user = new User({ username: username.trim(), email: email.trim(), password: password.trim() });
		await user.save();

		res.status(201).json({ message: 'Registration successful.' });
	} catch (error){
		res.status(500).json({message: 'Registration failed.', error: error.message});
	}
});

// Login
router.post('/auth/login', async (req, res) => {
	try {
		const { username, password } = req.body;
		const identifier = username?.trim();
		const cleanPassword = password?.trim();
		console.log('Login attempt for identifier:', identifier);
		console.log('Password length:', cleanPassword?.length);
		
		if (!identifier || !cleanPassword) {
			return res.status(400).json({ message: 'All fields required.' });
		}

		const user = await User.findOne({ $or: [{ username: identifier }, { email: identifier }] });
		console.log('User found:', !!user);
		if (!user) return res.status(401).json({ message: 'Invalid credentials.' });
		
		console.log('Stored password hash:', user.password);
		console.log('Attempting bcrypt compare...');

		const match = await bcrypt.compare(cleanPassword, user.password);
		console.log('Password match result:', match);
		if (!match) return res.status(401).json({ message: 'Invalid credentials.' });

		const token = jwt.sign({ username, userId: user._id }, JWT_SECRET, { expiresIn: '2h' });
		res.json({ token, message: 'Login successful.' });
	} catch (error) {
		console.error('Login error:', error);
		res.status(500).json({ message: 'Login failed.', error: error.message });
	}
});

router.get('/user', verifyToken, async (req, res) => {
	try {
		const user = await User.findById(req.user.userId).select('username email createdAt');
		if (!user) return res.status(404).json({ message: 'User not found.' });
		res.json(user);
	} catch (error) {
		console.error('Profile fetch error:', error);
		res.status(500).json({ message: 'Unable to fetch profile.', error: error.message });
	}
});

router.put('/user', verifyToken, async (req, res) => {
	try {
		const { username, email, password } = req.body;
		const user = await User.findById(req.user.userId);
		if (!user) return res.status(404).json({ message: 'User not found.' });

		if (username) user.username = username.trim();
		if (email) user.email = email.trim();
		if (password) user.password = password.trim();

		await user.save();
		res.json({ message: 'Profile updated successfully.', username: user.username, email: user.email });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ message: 'Username or email already in use.' });
		}
		console.error('Profile update error:', error);
		res.status(500).json({ message: 'Unable to update profile.', error: error.message });
	}
});

router.post("/ai", verifyToken, upload.single("image"), aiMedicalAssistant);

// ==============================
// EMERGENCY CONTACT ROUTES
// ==============================

// Get all emergency contacts for user
router.get('/emergency-contacts', verifyToken, async (req, res) => {
	try {
		const contacts = await EmergencyContact.find({ userId: req.user.userId }).sort({ isPrimary: -1, createdAt: -1 });
		res.json(contacts);
	} catch (error) {
		console.error('Error fetching contacts:', error);
		res.status(500).json({ message: 'Unable to fetch contacts.', error: error.message });
	}
});

// Add emergency contact
router.post('/emergency-contacts', verifyToken, async (req, res) => {
	try {
		const { contactName, phoneNumber, email, relationship, isPrimary } = req.body;
		if (!contactName || !phoneNumber) {
			return res.status(400).json({ message: 'Contact name and phone number required.' });
		}

		// If setting as primary, unset other primary contacts
		if (isPrimary) {
			await EmergencyContact.updateMany({ userId: req.user.userId }, { isPrimary: false });
		}

		const contact = new EmergencyContact({
			userId: req.user.userId,
			contactName,
			phoneNumber,
			email,
			relationship: relationship || 'Other',
			isPrimary: isPrimary || false
		});

		await contact.save();
		res.status(201).json({ message: 'Contact added successfully.', contact });
	} catch (error) {
		console.error('Error adding contact:', error);
		res.status(500).json({ message: 'Unable to add contact.', error: error.message });
	}
});

// Update emergency contact
router.put('/emergency-contacts/:contactId', verifyToken, async (req, res) => {
	try {
		const { contactName, phoneNumber, email, relationship, isPrimary } = req.body;
		const contact = await EmergencyContact.findById(req.params.contactId);

		if (!contact || contact.userId.toString() !== req.user.userId) {
			return res.status(404).json({ message: 'Contact not found.' });
		}

		if (contactName) contact.contactName = contactName;
		if (phoneNumber) contact.phoneNumber = phoneNumber;
		if (email) contact.email = email;
		if (relationship) contact.relationship = relationship;

		if (isPrimary && !contact.isPrimary) {
			await EmergencyContact.updateMany({ userId: req.user.userId }, { isPrimary: false });
			contact.isPrimary = true;
		}

		await contact.save();
		res.json({ message: 'Contact updated successfully.', contact });
	} catch (error) {
		console.error('Error updating contact:', error);
		res.status(500).json({ message: 'Unable to update contact.', error: error.message });
	}
});

// Delete emergency contact
router.delete('/emergency-contacts/:contactId', verifyToken, async (req, res) => {
	try {
		const contact = await EmergencyContact.findById(req.params.contactId);

		if (!contact || contact.userId.toString() !== req.user.userId) {
			return res.status(404).json({ message: 'Contact not found.' });
		}

		await EmergencyContact.deleteOne({ _id: req.params.contactId });
		res.json({ message: 'Contact deleted successfully.' });
	} catch (error) {
		console.error('Error deleting contact:', error);
		res.status(500).json({ message: 'Unable to delete contact.', error: error.message });
	}
});

// ==============================
// EMERGENCY HISTORY ROUTES
// ==============================

// Get emergency history
router.get('/emergency-history', verifyToken, async (req, res) => {
	try {
		const history = await EmergencyHistory.find({ userId: req.user.userId })
			.populate('contactsNotified')
			.sort({ createdAt: -1 });
		res.json(history);
	} catch (error) {
		console.error('Error fetching history:', error);
		res.status(500).json({ message: 'Unable to fetch history.', error: error.message });
	}
});

// Trigger emergency - save incident and notify contacts
router.post('/emergency', verifyToken, upload.single("image"), async (req, res) => {
	try {
		const { symptoms, userDescription, latitude, longitude, address, severity, requestAmbulance } = req.body;
		const user = await User.findById(req.user.userId);

		if (!user) {
			return res.status(404).json({ message: 'User not found.' });
		}

		// Get contacts to notify
		const contacts = await EmergencyContact.find({ userId: req.user.userId });
		const primaryContact = contacts.find(c => c.isPrimary) || contacts[0];
		const ambulanceRequested = requestAmbulance === 'true' || requestAmbulance === true;

		// Create emergency history record
		const emergency = new EmergencyHistory({
			userId: req.user.userId,
			symptoms: symptoms ? symptoms.split(',') : [],
			userDescription,
			location: {
				latitude,
				longitude,
				address: address || 'Unknown'
			},
			severity: severity || 'Medium',
			requestedAmbulance: ambulanceRequested,
			emergencyTeamNotified: true,
			contactsNotified: primaryContact ? [primaryContact._id] : []
		});

		if (req.file) {
			emergency.imageUrl = `/uploads/${req.file.filename}`;
		}

		await emergency.save();

		const symptomText = symptoms || 'Unknown';
		if (primaryContact && primaryContact.email) {
			await sendEmergencyAlert(primaryContact.email, user.username, symptomText, address, ambulanceRequested);
		}

		if (process.env.EMERGENCY_TEAM_EMAIL) {
			await sendTeamAlert(process.env.EMERGENCY_TEAM_EMAIL, user.username, symptomText, address, ambulanceRequested);
		}

		res.status(201).json({
			message: 'Emergency recorded and contacts notified.',
			emergencyId: emergency._id,
			contactNotified: primaryContact ? primaryContact.contactName : 'No contacts available',
			ambulanceRequested: ambulanceRequested
		});
	} catch (error) {
		console.error('Error recording emergency:', error);
		res.status(500).json({ message: 'Unable to record emergency.', error: error.message });
	}
});

// Resolve emergency
router.put('/emergency-history/:emergencyId/resolve', verifyToken, async (req, res) => {
	try {
		const emergency = await EmergencyHistory.findById(req.params.emergencyId);

		if (!emergency || emergency.userId.toString() !== req.user.userId) {
			return res.status(404).json({ message: 'Emergency record not found.' });
		}

		emergency.resolved = true;
		emergency.resolvedAt = new Date();
		await emergency.save();

		res.json({ message: 'Emergency marked as resolved.', emergency });
	} catch (error) {
		console.error('Error resolving emergency:', error);
		res.status(500).json({ message: 'Unable to resolve emergency.', error: error.message });
	}
});

export default router;
