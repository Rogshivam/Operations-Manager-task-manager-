const express = require('express');
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const User = require('../models/User');
const { protect, authorize, isProjectManager, isProjectManagerOrLead } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/projects
// @desc    Create a new project
// @access  Private (Managers only)
router.post('/', protect, authorize('manager'), [
  body('name')
    .notEmpty()
    .withMessage('Project name is required')
    .isLength({ max: 100 })
    .withMessage('Project name cannot exceed 100 characters'),
  body('description')
    .notEmpty()
    .withMessage('Project description is required')
    .isLength({ max: 1000 })
    .withMessage('Project description cannot exceed 1000 characters'),
  body('startDate')
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  body('endDate')
    .isISO8601()
    .withMessage('End date must be a valid date'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid priority level')
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

    const { name, description, startDate, endDate, priority, tags, budget } = req.body;

    // Check if end date is after start date
    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({
        message: 'End date must be after start date'
      });
    }

    // Create project
    const project = await Project.create({
      name,
      description,
      startDate,
      endDate,
      manager: req.user._id,
      priority: priority || 'medium',
      tags: tags || [],
      budget: budget || 0
    });

    // Populate manager details
    await project.populate('manager', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      message: 'Server error'
    });
  }
});

// @route   GET /api/projects
// @desc    Get all projects for the user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter projects based on user role
    if (req.user.role === 'manager') {
      // Managers can see all projects they manage
      query.manager = req.user._id;
    } else {
      // Team leads and members can see projects they're part of
      query.$or = [
        { 'teamMembers.user': req.user._id },
        { teamLead: req.user._id }
      ];
    }

    const projects = await Project.find(query)
      .populate('manager', 'firstName lastName email')
      .populate('teamLead', 'firstName lastName email')
      .populate('teamMembers.user', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Project.countDocuments(query);

    res.json({
      success: true,
      projects,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalProjects: total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      message: 'Server error'
    });
  }
});

// @route   GET /api/projects/:id
// @desc    Get single project
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('manager', 'firstName lastName email')
      .populate('teamLead', 'firstName lastName email')
      .populate('teamMembers.user', 'firstName lastName email role')
      .populate({
        path: 'tasks',
        populate: {
          path: 'assignedTo createdBy',
          select: 'firstName lastName email'
        }
      });

    if (!project) {
      return res.status(404).json({
        message: 'Project not found'
      });
    }

    // Check if user has access to this project
    const hasAccess = 
      project.manager._id.toString() === req.user._id.toString() ||
      project.teamMembers.some(member => member.user._id.toString() === req.user._id.toString()) ||
      (project.teamLead && project.teamLead._id.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({
        message: 'Not authorized to access this project'
      });
    }

    res.json({
      success: true,
      project
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      message: 'Server error'
    });
  }
});

// @route   PUT /api/projects/:id
// @desc    Update project
// @access  Private (Project manager only)
router.put('/:id', protect, isProjectManager, [
  body('name').optional().notEmpty().isLength({ max: 100 }),
  body('description').optional().notEmpty().isLength({ max: 1000 }),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  
], async (req, res) => {
  try {
    // . REMOVED VALIDATION - Let mongoose schema handle it
    // Validation middleware was rejecting teamLead object

    const updateData = req.body;

    // . Simple teamLead validation (optional)
    if (updateData.teamLead !== undefined && updateData.teamLead !== null) {
      if (!updateData.teamLead._id && typeof updateData.teamLead !== 'string') {
        return res.status(400).json({ 
          message: 'teamLead must be valid ObjectId or null' 
        });
      }
    }

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      updateData,
      { 
        new: true, 
        runValidators: true,
        overwrite: false  // Don't overwrite entire document
      }
    )
    .populate('manager', 'firstName lastName email')
    .populate('teamLead', 'firstName lastName email')
    .populate('teamMembers.user', 'firstName lastName email role');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json({
      success: true,
      message: 'Project updated successfully',
      project
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/projects/:id
// @desc    Delete project
// @access  Private (Project manager only)
router.delete('/:id', protect, isProjectManager, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        message: 'Project not found'
      });
    }

    // Check if project has tasks
    const Task = require('../models/Task');
    const taskCount = await Task.countDocuments({ project: req.params.id });

    if (taskCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete project with existing tasks. Please delete all tasks first.'
      });
    }

    await Project.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      message: 'Server error'
    });
  }
});

// @route   POST /api/projects/:id/team-members
// @desc    Add team member to project
// @access  Private (Project manager only)
router.post('/:id/team', protect, isProjectManager, [
  body('userId').isMongoId().withMessage('Valid user ID is required'),
  body('role').isIn(['team_lead', 'team_member']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { userId, role } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const project = await Project.findById(req.params.id).populate('teamMembers.user');
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const existingMember = project.teamMembers.find(
      member => member.user?._id?.toString() === userId
    );

    if (existingMember) {
      return res.status(400).json({ message: 'User is already a team member' });
    }

    // . Add team member
    project.teamMembers.push({ user: userId, role });

    if (role === 'team_lead') {
      project.teamLead = userId;
    }

    await project.save();

    // . RE-FETCH with proper population (key fix!)
    const updatedProject = await Project.findById(req.params.id)
      .populate('manager', 'firstName lastName email')
      .populate('teamLead', 'firstName lastName email')
      .populate('teamMembers.user', 'firstName lastName email role');

    res.json({
      success: true,
      message: 'Team member added successfully',
      project: updatedProject  // . Fully populated!
    });
  } catch (error) {
    console.error('Add team member error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/projects/:id/team-members/:userId
// @desc    Remove team member from project
// @access  Private (Project manager only)
router.delete('/:id/team/:userId', protect, isProjectManager, async (req, res) => {
  try {
    const { userId } = req.params;

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        message: 'Project not found'
      });
    }

    // Remove team member
    project.teamMembers = project.teamMembers.filter(
      member => member.user.toString() !== userId
    );

    // If removed user was team lead, clear team lead
    if (project.teamLead && project.teamLead.toString() === userId) {
      project.teamLead = null;
    }

    await project.save();

    await project.populate('teamMembers.user', 'firstName lastName email role');

    res.json({
      success: true,
      message: 'Team member removed successfully',
      project
    });
  } catch (error) {
    console.error('Remove team member error:', error);
    res.status(500).json({
      message: 'Server error'
    });
  }
});

module.exports = router; 