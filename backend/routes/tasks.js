// module.exports = router; 
const express = require('express');
const mongoose = require('mongoose'); // ✅ FIXED: Add mongoose import
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const { protect, isProjectManagerOrLead, isTaskAssigneeOrCreator } = require('../middleware/auth');
const { uploadSingle, uploadMultiple, uploadToCloudinary } = require('../middleware/upload');

const router = express.Router();


// @route   POST /api/tasks
// @desc    Create a new task
// @access  Private
router.post('/', protect, isProjectManagerOrLead, [
  body('title').notEmpty().withMessage('Task title required'),
], async (req, res) => {
  try {
    const { title, description, projectId, assignedTo, priority, dueDate } = req.body;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const task = await Task.create({
      title,
      description,
      project: projectId,
      assignedTo,
      createdBy: req.user._id,
      priority: priority || 'medium',
      status: 'pending',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      recurringPattern: 'none'
    });

    // Add uploaded files
    if (req.files && req.files.length > 0) {
      const uploadedFiles = [];
      for (const file of req.files) {
        let fileData = {
          filename: file.filename,
          originalName: file.originalname,
          fileUrl: `${req.protocol}://${req.get('host')}/uploads/${file.filename}`,
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedBy: req.user._id
        };
        uploadedFiles.push(fileData);
      }
      task.attachments.push(...uploadedFiles);
      await task.save();
    }
    
    await task.populate('assignedTo createdBy project');
    res.status(201).json({ success: true, task });
  } catch (error) {
    console.error('Task creation error:', error);
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/tasks
// @desc    Get tasks for the user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { 
      page = 1, limit = 10, status, priority, projectId, assignedTo, search, sortBy = 'dueDate', sortOrder = 'asc'
    } = req.query;

    const skip = (page - 1) * parseInt(limit);
    
    // ✅ 1. START with projectId filter (MANDATORY if provided)
    let query = projectId ? { project: projectId } : {};

    // ✅ 2. ADD other filters (combine with projectId)
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // ✅ 3. User role filtering (COMBINE with existing query, DON'T overwrite)
    if (req.user.role !== 'manager') {
      // Team members only see assigned tasks OR their project tasks
      const existingQuery = { ...query };
      query.$and = [
        existingQuery,
        {
          $or: [
            { assignedTo: req.user._id },
            { createdBy: req.user._id }
          ]
        }
      ];
    }

    // console.log('🔍 FINAL Tasks query:', JSON.stringify(query, null, 2));

    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const tasks = await Task.find(query)
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .populate('project', 'name')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Task.countDocuments(query);

    res.json({
      success: true,
      tasks,
      pagination: { currentPage: parseInt(page), totalPages: Math.ceil(total / limit), totalTasks: total }
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// @route   GET /api/tasks/:id
// @desc    Get single task
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .populate('project', 'name description')
      .populate('attachments.uploadedBy', 'firstName lastName email');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check access
    const project = await Project.findById(task.project);
    const hasAccess = 
      project.manager.toString() === req.user._id.toString() ||
      task.assignedTo._id.toString() === req.user._id.toString() ||
      task.createdBy._id.toString() === req.user._id.toString() ||
      project.teamMembers.some(member => member.user.toString() === req.user._id.toString()) ||
      (project.teamLead && project.teamLead.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({ message: 'Not authorized to access this task' });
    }

    res.json({ success: true, task });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/tasks/:id
// @desc    Update task
// @access  Private
router.put('/:id', protect, isTaskAssigneeOrCreator, [
  body('title').optional().notEmpty().withMessage('Task title cannot be empty'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('status').optional().isIn(['pending', 'in_progress', 'review', 'completed', 'cancelled']),
  body('dueDate').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const updates = req.body;
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate([
      { path: 'assignedTo', select: 'firstName lastName email' },
      { path: 'createdBy', select: 'firstName lastName email' },
      { path: 'project', select: 'name' },
      { path: 'attachments.uploadedBy', select: 'firstName lastName email' }
    ]);

    res.json({
      success: true,
      message: 'Task updated successfully',
      task
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete task
// @access  Private
router.delete('/:id', protect, isTaskAssigneeOrCreator, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const project = await Project.findById(task.project);
    const canDelete = 
      task.createdBy.toString() === req.user._id.toString() ||
      project.manager.toString() === req.user._id.toString() ||
      (project.teamLead && project.teamLead.toString() === req.user._id.toString());

    if (!canDelete) {
      return res.status(403).json({ message: 'Not authorized to delete this task' });
    }

    await Task.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ FIXED: Single file upload with mongoose validation
// router.post('/:id/attachments', protect, 
//   // ✅ FIXED: Validation middleware FIRST
//   (req, res, next) => {
//     if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
//       return res.status(400).json({ 
//         message: 'Invalid task ID format',
//         received: req.params.id
//       });
//     }
//     next();
//   },
//   isTaskAssigneeOrCreator, 
//   uploadSingle, 
//   async (req, res) => {
//     try {
//       const task = await Task.findById(req.params.id);
//       if (!task) {
//         return res.status(404).json({ message: 'Task not found' });
//       }

//       if (!req.file) {
//         return res.status(400).json({ message: 'No file uploaded' });
//       }

//       let fileData;

//       if (process.env.CLOUDINARY_CLOUD_NAME) {
//         fileData = await uploadToCloudinary(req.file);
//       } else {
//         const baseUrl = `${req.protocol}://${req.get('host')}`;
//         fileData = {
//           filename: req.file.filename,
//           originalName: req.file.originalname,
//           fileUrl: `${baseUrl}/uploads/${req.file.filename}`,
//           fileSize: req.file.size,
//           mimeType: req.file.mimetype
//         };
//       }

//       fileData.uploadedBy = req.user._id;
//       task.attachments.push(fileData);
//       await task.save();

//       await task.populate([
//         { path: 'assignedTo', select: 'firstName lastName email' },
//         { path: 'createdBy', select: 'firstName lastName email' },
//         { path: 'project', select: 'name' },
//         { path: 'attachments.uploadedBy', select: 'firstName lastName email' }
//       ]);

//       res.json({
//         success: true,
//         message: 'Attachment uploaded successfully',
//         task
//       });
//     } catch (error) {
//       console.error('Single attachment upload error:', error);
//       res.status(500).json({ message: 'Server error' });
//     }
//   }
// );
// ✅ SINGLE CORRECT ROUTE - DELETE ALL OTHERS
// ❌ DELETE your current uploadSingle middleware route
// ✅ REPLACE WITH RAW multer (NO middleware/auth issues)

router.post(
  '/:id/attachments',
  protect,
  (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: 'Invalid task ID format',
        received: req.params.id
      });
    }
    next();
  },
  isTaskAssigneeOrCreator,
  uploadSingle,
  async (req, res) => {
    try {
      const task = await Task.findById(req.params.id);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      let fileData;

      // Debug which storage path will be used
      // console.log('Cloudinary env presence:', {
      //   CLOUDINARY_CLOUD_NAME: !!process.env.CLOUDINARY_CLOUD_NAME,
      //   CLOUDINARY_API_KEY:   !!process.env.CLOUDINARY_API_KEY,
      //   CLOUDINARY_API_SECRET:!!process.env.CLOUDINARY_API_SECRET,
      //   CLOUDINARY_URL: !!process.env.CLOUDINARY_URL
      // });

      const cloudinaryEnabled = Boolean(
        (
          process.env.CLOUDINARY_CLOUD_NAME &&
          process.env.CLOUDINARY_API_KEY &&
          process.env.CLOUDINARY_API_SECRET
        ) || process.env.CLOUDINARY_URL
      );

      if (cloudinaryEnabled) {
        // console.log('📤 Using Cloudinary for task attachment upload');
        fileData = await uploadToCloudinary(req.file);
      } else {
        // console.log('💾 Using local storage for task attachment upload');
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        fileData = {
          filename: req.file.filename,
          originalName: req.file.originalname,
          fileUrl: `${baseUrl}/uploads/${req.file.filename}`,
          fileSize: req.file.size,
          mimeType: req.file.mimetype
        };
      }

      fileData.uploadedBy = req.user._id;
      task.attachments.push(fileData);
      await task.save();

      await task.populate([
        { path: 'assignedTo', select: 'firstName lastName email' },
        { path: 'createdBy', select: 'firstName lastName email' },
        { path: 'project', select: 'name' },
        { path: 'attachments.uploadedBy', select: 'firstName lastName email' }
      ]);

      res.json({
        success: true,
        message: 'Attachment uploaded successfully',
        task
      });
    } catch (error) {
      console.error('Single attachment upload error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);



// Multiple attachments
// router.post('/:id/attachments', protect, isTaskAssigneeOrCreator, uploadMultiple, async (req, res) => {
//   try {
//     const task = await Task.findById(req.params.id);
//     if (!task) return res.status(404).json({ message: 'Task not found' });

//     if (!req.files || req.files.length === 0) {
//       return res.status(400).json({ message: 'No files uploaded' });
//     }

//     const uploadedFiles = [];
//     for (const file of req.files) {
//       let fileData;
//       if (process.env.CLOUDINARY_CLOUD_NAME) {
//         fileData = await uploadToCloudinary(file);
//       } else {
//         const baseUrl = `${req.protocol}://${req.get('host')}`;
//         fileData = {
//           filename: file.filename,
//           originalName: file.originalname,
//           fileUrl: `${baseUrl}/uploads/${file.filename}`,
//           fileSize: file.size,
//           mimeType: file.mimetype
//         };
//       }
//       fileData.uploadedBy = req.user._id;
//       uploadedFiles.push(fileData);
//     }

//     task.attachments.push(...uploadedFiles);
//     await task.save();

//     await task.populate([
//       { path: 'assignedTo', select: 'firstName lastName email' },
//       { path: 'createdBy', select: 'firstName lastName email' },
//       { path: 'project', select: 'name' },
//       { path: 'attachments.uploadedBy', select: 'firstName lastName email' }
//     ]);

//     res.json({
//       success: true,
//       message: 'Attachments uploaded successfully',
//       task
//     });
//   } catch (error) {
//     console.error('Upload attachments error:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// Delete attachment
router.delete('/:id/attachments/:attachmentId', protect, isTaskAssigneeOrCreator, async (req, res) => {
  try {
    const { attachmentId } = req.params;
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const attachment = task.attachments.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    task.attachments.pull(attachmentId);
    await task.save();

    await task.populate([
      { path: 'assignedTo', select: 'firstName lastName email' },
      { path: 'createdBy', select: 'firstName lastName email' },
      { path: 'project', select: 'name' },
      { path: 'attachments.uploadedBy', select: 'firstName lastName email' }
    ]);

    res.json({
      success: true,
      message: 'Attachment deleted successfully',
      task
    });
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add comment
router.post('/:id/comments', protect, [
  body('content').notEmpty().isLength({ max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { content } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check access
    const project = await Project.findById(task.project);
    const hasAccess = 
      project.manager.toString() === req.user._id.toString() ||
      task.assignedTo.toString() === req.user._id.toString() ||
      task.createdBy.toString() === req.user._id.toString() ||
      project.teamMembers.some(member => member.user.toString() === req.user._id.toString()) ||
      (project.teamLead && project.teamLead.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({ message: 'Not authorized to comment on this task' });
    }

    task.comments.push({ user: req.user._id, content });
    await task.save();

    await task.populate([
      { path: 'assignedTo', select: 'firstName lastName email' },
      { path: 'createdBy', select: 'firstName lastName email' },
      { path: 'project', select: 'name' },
      { path: 'comments.user', select: 'firstName lastName email' },
      { path: 'attachments.uploadedBy', select: 'firstName lastName email' }
    ]);

    res.json({
      success: true,
      message: 'Comment added successfully',
      task
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
