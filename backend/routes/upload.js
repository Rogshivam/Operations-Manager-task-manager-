const express = require('express');
const { protect } = require('../middleware/auth');
const { uploadSingle, uploadMultiple, uploadToCloudinary } = require('../middleware/upload');

const router = express.Router();

// @route   POST /api/upload/single
// @desc    Upload a single file
// @access  Private
router.post('/single', protect, uploadSingle, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'No file uploaded'
      });
    }

    let fileData;

    // Upload to Cloudinary if configured, otherwise use local storage
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      fileData = await uploadToCloudinary(req.file);
    } else {
      // Use local file path
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      fileData = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        fileUrl: `${baseUrl}/uploads/${req.file.filename}`,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedBy: req.user._id
      };
    }

    res.json({
      success: true,
      message: 'File uploaded successfully',
      file: fileData
    });
  } catch (error) {
    console.error('Single file upload error:', error);
    res.status(500).json({
      message: 'Server error during file upload'
    });
  }
});

// @route   POST /api/upload/multiple
// @desc    Upload multiple files
// @access  Private
router.post('/multiple', protect, uploadMultiple, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        message: 'No files uploaded'
      });
    }

    const uploadedFiles = [];

    for (const file of req.files) {
      let fileData;

      // Upload to Cloudinary if configured, otherwise use local storage
      if (process.env.CLOUDINARY_CLOUD_NAME) {
        fileData = await uploadToCloudinary(file);
      } else {
        // Use local file path
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        fileData = {
          filename: file.filename,
          originalName: file.originalname,
          fileUrl: `${baseUrl}/uploads/${file.filename}`,
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedBy: req.user._id
        };
      }

      uploadedFiles.push(fileData);
    }

    res.json({
      success: true,
      message: 'Files uploaded successfully',
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Multiple files upload error:', error);
    res.status(500).json({
      message: 'Server error during file upload'
    });
  }
});

// @route   DELETE /api/upload/:filename
// @desc    Delete uploaded file
// @access  Private
router.delete('/:filename', protect, async (req, res) => {
  try {
    const { filename } = req.params;
    const fs = require('fs');
    const path = require('path');

    const filePath = path.join(__dirname, '../uploads', filename);

    // Check if file exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      
      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } else {
      res.status(404).json({
        message: 'File not found'
      });
    }
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      message: 'Server error during file deletion'
    });
  }
});

module.exports = router; 