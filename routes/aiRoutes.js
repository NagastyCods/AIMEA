import express from "express";
import multer from "multer";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { uploadCloudinary as upload } from "../config/cloudinaryConfig.js";
import { body, param, query, validationResult } from 'express-validator';
import User from "../models/users.js";
import EmergencyContact from "../models/emergencyContact.js";
import EmergencyHistory from "../models/emergencyHistory.js";
import ChatHistory from "../models/chatHistory.js";
import { aiMedicalAssistant } from "../controllers/aiController.js";
import { sendContactMessage, sendEmergencyAlert, sendTeamAlert } from "../config/emailService.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

const OVERPASS_URL = process.env.OVERPASS_API_URL;
const OVERPASS_UA = process.env.OVERPASS_USER_AGENT;

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  next();
};

function haversineDistanceM(lat1, lon1, lat2, lon2) {
	const R = 6371000;
	const toRad = (d) => (d * Math.PI) / 180;
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

function elementLatLon(el) {
	if (el.type === 'node' && el.lat != null && el.lon != null) {
		return { lat: el.lat, lon: el.lon };
	}
	if (el.center && el.center.lat != null && el.center.lon != null) {
		return { lat: el.center.lat, lon: el.center.lon };
	}
	return null;
}

function buildAddressFromTags(tags) {
	if (!tags) return '';
	if (tags['addr:full']) return String(tags['addr:full']);
	const line1 = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ').trim();
	const line2 = [tags['addr:city'] || tags['addr:town'] || tags['addr:village'], tags['addr:state'], tags['addr:postcode']]
		.filter(Boolean)
		.join(', ');
	return [line1, line2].filter(Boolean).join(line1 && line2 ? ', ' : '') || '';
}

function firstPhone(tags) {
	if (!tags) return '';
	const raw =
		tags.phone ||
		tags['contact:phone'] ||
		tags['phone:mobile'] ||
		tags['contact:mobile'] ||
		'';
	if (!raw) return '';
	const first = String(raw).split(/[;/|]/)[0].trim();
	return first;
}

function firstEmail(tags) {
	if (!tags) return '';
	const raw = tags.email || tags['contact:email'] || '';
	if (!raw) return '';
	return String(raw).split(/[;\s|]/)[0].trim();
}

const verifyToken = (req, res, next) => {
	const token = req.headers['authorization']?.split(' ')[1];
	if (!token) return res.status(401).json({ message: 'No token provided.' });
	jwt.verify(token, JWT_SECRET, (err, decoded) => {
		if (err) return res.status(403).json({ message: 'Invalid token.' });
		req.user = decoded;
		next();
	});
};
export { verifyToken };

router.post('/contact',
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('email').trim().isEmail().withMessage('A valid email is required.').normalizeEmail(),
  body('subject').trim().notEmpty().withMessage('Subject is required.'),
  body('message').trim().notEmpty().withMessage('Message is required.'),
  validate,
  async (req, res) => {
    try {
      const { name, email, subject, message } = req.body;
      const result = await sendContactMessage(name, email, subject, message);

      if (!result.success) {
        return res.status(500).json({ message: 'Unable to send your message right now.', error: result.error });
      }

      res.json({
        message: 'Your message has been sent successfully.',
        notificationType: 'contact-request',
        recipient: process.env.EMERGENCY_TEAM_EMAIL || process.env.EMAIL_USER
      });
    } catch (error) {
      console.error('Contact form error:', error);
      res.status(500).json({ message: 'Unable to send your message right now.', error: error.message });
    }
  }
);

// Register
router.post('/auth/register',
	body('username').trim().isLength({ min: 3, max: 32 }).withMessage('Username must be between 3 and 32 characters.'),
	body('email').trim().isEmail().withMessage('A valid email is required.').normalizeEmail(),
	body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.'),
	validate,
	async (req, res) => {
	try {
		const { username, email, password } = req.body;

		const existingUsername = await User.findOne({ username });
		if (existingUsername) return res.status(409).json({ message: 'Username already exists.' });

		const existingEmail = await User.findOne({ email });
		if (existingEmail) return res.status(409).json({ message: 'Email already in use.' });

		const user = new User({ username, email, password });
		await user.save();

		res.status(201).json({ message: 'Registration successful.' });
	} catch (error) {
		res.status(500).json({ message: 'Registration failed.', error: error.message });
	}
});

// Login
router.post('/auth/login',
	body('username').trim().notEmpty().withMessage('Username or email is required.'),
	body('password').notEmpty().withMessage('Password is required.'),
	validate,
	async (req, res) => {
	try {
		const { username, password } = req.body;
		const identifier = username.trim();
		const cleanPassword = password.trim();

		const user = await User.findOne({ $or: [{ username: identifier }, { email: identifier }] });
		if (!user) return res.status(401).json({ message: 'Invalid credentials.' });

		const match = await bcrypt.compare(cleanPassword, user.password);
		if (!match) return res.status(401).json({ message: 'Invalid credentials.' });

		const token = jwt.sign({ username: user.username, userId: user._id }, JWT_SECRET, { expiresIn: '2h' });
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

router.put('/user', verifyToken,
	body('username').optional().trim().isLength({ min: 3, max: 32 }).withMessage('Username must be between 3 and 32 characters.'),
	body('email').optional().trim().isEmail().withMessage('A valid email is required.').normalizeEmail(),
	body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.'),
	validate,
	async (req, res) => {
	try {
		const { username, email, password } = req.body;
		const user = await User.findById(req.user.userId);
		if (!user) return res.status(404).json({ message: 'User not found.' });

		if (username) user.username = username;
		if (email) user.email = email;
		if (password) user.password = password;

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

router.post('/ai', verifyToken,
	upload.single('image'),
	body('message').optional().trim().isString().isLength({ max: 1000 }).withMessage('Message must be 1000 characters or fewer.'),
	validate,
	aiMedicalAssistant);

// Chat history routes
router.get('/chat-history', verifyToken, async (req, res) => {
  try {
    const history = await ChatHistory.find({ userId: req.user.userId }).sort({ updatedAt: -1 });
    res.json(history);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ message: 'Unable to fetch chat history.', error: error.message });
  }
});

router.get('/chat-history/:sessionId', verifyToken,
	param('sessionId').isMongoId().withMessage('Valid session ID is required.'),
	validate,
	async (req, res) => {
  try {
    const session = await ChatHistory.findOne({ _id: req.params.sessionId, userId: req.user.userId });
    if (!session) {
      return res.status(404).json({ message: 'Chat session not found.' });
    }
    res.json(session);
  } catch (error) {
    console.error('Error fetching chat session:', error);
    res.status(500).json({ message: 'Unable to fetch chat session.', error: error.message });
  }
});

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
router.post('/emergency-contacts', verifyToken,
	body('contactName').trim().notEmpty().withMessage('Contact name is required.').isLength({ max: 80 }),
	body('phoneNumber').trim().notEmpty().withMessage('Phone number is required.'),
	body('email').optional().trim().isEmail().withMessage('Valid email is required.').normalizeEmail(),
	body('relationship').optional().isIn(['Family', 'Friend', 'Doctor', 'Caregiver', 'Other']).withMessage('Relationship must be one of the allowed values.'),
	body('isPrimary').optional().isBoolean().toBoolean(),
	validate,
	async (req, res) => {
	try {
		const { contactName, phoneNumber, email, relationship, isPrimary } = req.body;

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
router.put('/emergency-contacts/:contactId', verifyToken,
	param('contactId').isMongoId().withMessage('Valid contact ID is required.'),
	body('contactName').optional().trim().isLength({ max: 80 }),
	body('phoneNumber').optional().trim().notEmpty().withMessage('Phone number may not be empty.'),
	body('email').optional().trim().isEmail().withMessage('Valid email is required.').normalizeEmail(),
	body('relationship').optional().isIn(['Family', 'Friend', 'Doctor', 'Caregiver', 'Other']).withMessage('Relationship must be valid.'),
	body('isPrimary').optional().isBoolean().toBoolean(),
	validate,
	async (req, res) => {
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
router.delete('/emergency-contacts/:contactId', verifyToken,
	param('contactId').isMongoId().withMessage('Valid contact ID is required.'),
	validate,
	async (req, res) => {
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
router.post('/emergency', verifyToken, upload.single('image'),
	body('symptoms').optional().trim().isLength({ max: 1000 }).withMessage('Symptoms must be 1000 characters or fewer.'),
	body('userDescription').optional().trim().isLength({ max: 1500 }).withMessage('Description must be 1500 characters or fewer.'),
	body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitude must be valid.').toFloat(),
	body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude must be valid.').toFloat(),
	body('address').optional().trim().isLength({ max: 300 }).withMessage('Address must be 300 characters or fewer.'),
	body('severity').optional().isIn(['Low', 'Medium', 'High', 'Critical']).withMessage('Severity must be Low, Medium, High, or Critical.'),
	body('requestAmbulance').optional().isBoolean().toBoolean(),
	validate,
	async (req, res) => {
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
			emergency.imageUrl = req.file.secure_url;
			// emergency.imageUrl = `/uploads/${req.file.filename}`;
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

// Nearby hospitals / clinics (OpenStreetMap via Overpass; public for emergency SOS page)
router.get('/nearby-hospitals',
	query('lat').exists().isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required.').toFloat(),
	query('lng').exists().isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required.').toFloat(),
	query('radiusM').optional().isInt({ min: 1000, max: 25000 }).toInt(),
	validate,
	async (req, res) => {
	try {
		const lat = parseFloat(req.query.lat);
		const lng = parseFloat(req.query.lng);
		let radiusM = parseInt(String(req.query.radiusM || req.query.radius || '10000'), 10);

		if (Number.isNaN(lat) || Number.isNaN(lng)) {
			return res.status(400).json({ message: 'Query parameters lat and lng are required and must be numbers.' });
		}
		if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
			return res.status(400).json({ message: 'Coordinates are out of valid range.' });
		}
		if (Number.isNaN(radiusM) || radiusM < 1000) radiusM = 10000;
		radiusM = Math.min(radiusM, 25000);

		const query = `[out:json][timeout:25];
(
  node["amenity"="hospital"](around:${radiusM},${lat},${lng});
  way["amenity"="hospital"](around:${radiusM},${lat},${lng});
  node["amenity"="clinic"](around:${radiusM},${lat},${lng});
  way["amenity"="clinic"](around:${radiusM},${lat},${lng});
  node["healthcare"="hospital"](around:${radiusM},${lat},${lng});
  way["healthcare"="hospital"](around:${radiusM},${lat},${lng});
);
out center tags;`;

		const ac = new AbortController();
		const t = setTimeout(() => ac.abort(), 28000);

		const overRes = await fetch(OVERPASS_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'User-Agent': OVERPASS_UA
			},
			body: `data=${encodeURIComponent(query)}`,
			signal: ac.signal
		});
		clearTimeout(t);

		if (!overRes.ok) {
			return res.status(503).json({ message: 'Hospital directory service returned an error. Try again shortly.' });
		}

		const data = await overRes.json();
		const elements = Array.isArray(data.elements) ? data.elements : [];

		const seen = new Set();
		const hospitals = [];

		for (const el of elements) {
			const pos = elementLatLon(el);
			if (!pos) continue;
			const tags = el.tags || {};
			const name = (tags.name && String(tags.name).trim()) || 'Unnamed facility';
			const dedupeKey = `${name.toLowerCase()}_${pos.lat.toFixed(4)}_${pos.lon.toFixed(4)}`;
			if (seen.has(dedupeKey)) continue;
			seen.add(dedupeKey);

			const distanceM = haversineDistanceM(lat, lng, pos.lat, pos.lon);
			const phone = firstPhone(tags);
			const email = firstEmail(tags);
			const address = buildAddressFromTags(tags);

			hospitals.push({
				osmType: el.type,
				osmId: el.id,
				name,
				lat: pos.lat,
				lon: pos.lon,
				distanceM: Math.round(distanceM),
				address,
				phone: phone || null,
				email: email || null,
				amenity: tags.amenity || tags.healthcare || null
			});
		}

		hospitals.sort((a, b) => a.distanceM - b.distanceM);
		const limited = hospitals.slice(0, 15);

		res.json({
			radiusM,
			count: limited.length,
			hospitals: limited,
			source: 'OpenStreetMap contributors (data may be incomplete; verify before travel.)'
		});
	} catch (error) {
		if (error.name === 'AbortError') {
			return res.status(504).json({ message: 'Hospital lookup timed out. Please try again.' });
		}
		console.error('nearby-hospitals error:', error);
		res.status(500).json({ message: 'Unable to fetch nearby hospitals.', error: error.message });
	}
});

// Resolve emergency
router.put('/emergency-history/:emergencyId/resolve', verifyToken,
	param('emergencyId').isMongoId().withMessage('Valid emergency ID is required.'),
	validate,
	async (req, res) => {
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
