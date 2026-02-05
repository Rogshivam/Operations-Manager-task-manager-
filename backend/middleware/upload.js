const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  
  // console.log('✅ FORCING ACCEPT');      // ← MUST HAVE THIS LINE
  cb(null, true);                       // ← MUST HAVE THIS LINE
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  // limits: {
  //   fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
  //   files: 5 // Maximum 5 files per request
  // }
});

// Single file upload middleware
const uploadSingle = upload.single('file');

// Multiple files upload middleware
const uploadMultiple = upload.array('files', 5);

// Error handling wrapper
const handleUpload = (uploadMiddleware) => {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            message: 'File too large',
            error: `File size should be less than ${process.env.MAX_FILE_SIZE || '10MB'}`
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            message: 'Too many files',
            error: 'Maximum 5 files allowed per request'
          });
        }
        return res.status(400).json({
          message: 'File upload error',
          error: err.message
        });
      } else if (err) {
        return res.status(400).json({
          message: 'File upload error',
          error: err.message
        });
      }
      next();
    });
  };
};

// Cloudinary upload configuration (alternative to local storage)
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload to Cloudinary
const uploadToCloudinary = async (file) => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'task-manager',
      resource_type: 'auto',
      transformation: [
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    });
    
    // Delete local file after upload
    fs.unlinkSync(file.path);
    
    return {
      filename: result.public_id,
      originalName: file.originalname,
      fileUrl: result.secure_url,
      fileSize: result.bytes,
      mimeType: file.mimetype
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('File upload failed');
  }
};

// Helper function to get file extension
const getFileExtension = (filename) => {
  return path.extname(filename).toLowerCase();
};

// Helper function to check if file is image
const isImage = (mimetype) => {
  return mimetype.startsWith('image/');
};

// Helper function to check if file is document
const isDocument = (mimetype) => {
  const documentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  return documentTypes.includes(mimetype);
};

module.exports = {
  uploadSingle: upload.single('file'), 
  uploadMultiple: handleUpload(uploadMultiple),
  uploadToCloudinary,
  getFileExtension,
  isImage,
  isDocument
}; 