import aws from 'aws-sdk';
import multerS3 from 'multer-s3';
import multer from 'multer';
import path from 'path';

// Configure AWS S3
const s3 = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

// Set up S3 storage for multer
const storage = multerS3({
  s3: s3,
  bucket: process.env.AWS_S3_BUCKET,
  acl: 'public-read', // Make uploaded files publicly readable
  metadata: (req, file, cb) => {
    cb(null, {
      fieldName: file.fieldname,
      uploadedAt: new Date().toISOString(),
    });
  },
  key: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const filename = `uploads/${uniqueSuffix}${path.extname(file.originalname)}`;
    cb(null, filename);
  }
});

// Create multer upload middleware with S3 storage
const uploadS3 = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed.'));
    }
    
    cb(null, true);
  },
});

export default uploadS3;
