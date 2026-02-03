const express = require('express');
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

// routes/tasks.js - FULLY WORKING WITH AUTH
router.post('/', protect, isProjectManagerOrLead, [
  body('title').notEmpty().withMessage('Task title required'),
], async (req, res) => {
  try {
    
    const { title, description, projectId, assignedTo, priority, dueDate } = req.body;
    
    // . Now projectId exists (checked by middleware)
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const task = await Task.create({
      title,
      description,
      project: projectId,
      assignedTo,
      createdBy: req.user._id,  //  Authenticated user
      priority: priority || 'medium',
      status: 'pending',
      dueDate: new Date(dueDate),
      recurringPattern: 'none'  //  Schema fix
    });

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
      page = 1, 
      limit = 10, 
      status, 
      priority, 
      projectId, 
      assignedTo,
      search,
      sortBy = 'dueDate',
      sortOrder = 'asc'
    } = req.query;

    const skip = (page - 1) * limit;
    let query = {};

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by priority
    if (priority) {
      query.priority = priority;
    }

    // Filter by project
    if (projectId) {
      query.project = projectId;
    }

    // Filter by assigned user
    if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter tasks based on user role and access
    if (req.user.role === 'manager') {
      // Managers can see all tasks in their projects
      const userProjects = await Project.find({ manager: req.user._id });
      query.project = { $in: userProjects.map(p => p._id) };
    } else {
      // Team leads and members can see tasks assigned to them or in their projects
      const userProjects = await Project.find({
        $or: [
          { 'teamMembers.user': req.user._id },
          { teamLead: req.user._id }
        ]
      });
      
      query.$or = [
        { assignedTo: req.user._id },
        { project: { $in: userProjects.map(p => p._id) } }
      ];
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

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
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalTasks: total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      message: 'Server error'
    });
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
      return res.status(404).json({
        message: 'Task not found'
      });
    }

    // Check if user has access to this task
    const project = await Project.findById(task.project);
    const hasAccess = 
      project.manager.toString() === req.user._id.toString() ||
      task.assignedTo._id.toString() === req.user._id.toString() ||
      task.createdBy._id.toString() === req.user._id.toString() ||
      project.teamMembers.some(member => member.user.toString() === req.user._id.toString()) ||
      (project.teamLead && project.teamLead.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({
        message: 'Not authorized to access this task'
      });
    }

    res.json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      message: 'Server error'
    });
  }
});

// @route   PUT /api/tasks/:id
// @desc    Update task
// @access  Private (Task assignee, creator, or project manager/lead)
router.put('/:id', protect, isTaskAssigneeOrCreator, [
  body('title')
    .optional()
    .notEmpty()
    .withMessage('Task title cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Task title cannot exceed 200 characters'),
  body('description')
    .optional()
    .notEmpty()
    .withMessage('Task description cannot be empty')
    .isLength({ max: 2000 })
    .withMessage('Task description cannot exceed 2000 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid priority level'),
  body('status')
    .optional()
    .isIn(['pending', 'in_progress', 'review', 'completed', 'cancelled'])
    .withMessage('Invalid status'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date'),
  body('estimatedHours')
    .optional()
    .isNumeric()
    .withMessage('Estimated hours must be a number'),
  body('actualHours')
    .optional()
    .isNumeric()
    .withMessage('Actual hours must be a number')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { 
      title, 
      description, 
      priority, 
      status, 
      dueDate, 
      estimatedHours, 
      actualHours,
      tags 
    } = req.body;

    const updateFields = {};
    if (title) updateFields.title = title;
    if (description) updateFields.description = description;
    if (priority) updateFields.priority = priority;
    if (status) updateFields.status = status;
    if (dueDate) updateFields.dueDate = dueDate;
    if (estimatedHours !== undefined) updateFields.estimatedHours = estimatedHours;
    if (actualHours !== undefined) updateFields.actualHours = actualHours;
    if (tags) updateFields.tags = tags;

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      updateFields,
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
    res.status(500).json({
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete task
// @access  Private (Task creator or project manager/lead)
router.delete('/:id', protect, isTaskAssigneeOrCreator, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        message: 'Task not found'
      });
    }

    // Only task creator or project manager/lead can delete
    const project = await Project.findById(task.project);
    const canDelete = 
      task.createdBy.toString() === req.user._id.toString() ||
      project.manager.toString() === req.user._id.toString() ||
      (project.teamLead && project.teamLead.toString() === req.user._id.toString());

    if (!canDelete) {
      return res.status(403).json({
        message: 'Not authorized to delete this task'
      });
    }

    await Task.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      message: 'Server error'
    });
  }
});

// @route   POST /api/tasks/:id/attachments
// @desc    Upload attachments to task
// @access  Private (Task assignee, creator, or project manager/lead)
router.post('/:id/attachments', protect, isTaskAssigneeOrCreator, uploadMultiple, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        message: 'Task not found'
      });
    }

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
          mimeType: file.mimetype
        };
      }

      fileData.uploadedBy = req.user._id;
      uploadedFiles.push(fileData);
    }

    // Add attachments to task
    task.attachments.push(...uploadedFiles);
    await task.save();

    await task.populate([
      { path: 'assignedTo', select: 'firstName lastName email' },
      { path: 'createdBy', select: 'firstName lastName email' },
      { path: 'project', select: 'name' },
      { path: 'attachments.uploadedBy', select: 'firstName lastName email' }
    ]);

    res.json({
      success: true,
      message: 'Attachments uploaded successfully',
      task
    });
  } catch (error) {
    console.error('Upload attachments error:', error);
    res.status(500).json({
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/tasks/:id/attachments/:attachmentId
// @desc    Delete attachment from task
// @access  Private (Task assignee, creator, or project manager/lead)
router.delete('/:id/attachments/:attachmentId', protect, isTaskAssigneeOrCreator, async (req, res) => {
  try {
    const { attachmentId } = req.params;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        message: 'Task not found'
      });
    }

    const attachment = task.attachments.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({
        message: 'Attachment not found'
      });
    }

    // Remove attachment
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
    res.status(500).json({
      message: 'Server error'
    });
  }
});

// @route   POST /api/tasks/:id/comments
// @desc    Add comment to task
// @access  Private (Task assignee, creator, or project team member)
router.post('/:id/comments', protect, [
  body('content')
    .notEmpty()
    .withMessage('Comment content is required')
    .isLength({ max: 1000 })
    .withMessage('Comment cannot exceed 1000 characters')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { content } = req.body;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        message: 'Task not found'
      });
    }

    // Check if user has access to this task
    const project = await Project.findById(task.project);
    const hasAccess = 
      project.manager.toString() === req.user._id.toString() ||
      task.assignedTo.toString() === req.user._id.toString() ||
      task.createdBy.toString() === req.user._id.toString() ||
      project.teamMembers.some(member => member.user.toString() === req.user._id.toString()) ||
      (project.teamLead && project.teamLead.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({
        message: 'Not authorized to comment on this task'
      });
    }

    // Add comment
    task.comments.push({
      user: req.user._id,
      content
    });

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
    res.status(500).json({
      message: 'Server error'
    });
  }
});

module.exports = router; 