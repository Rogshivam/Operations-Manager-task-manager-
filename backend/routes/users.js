const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users (for managers)
// @access  Private (Managers only)
router.get('/', protect, authorize('manager'), async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search, isActive } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    // Filter by role
    if (role) {
      query.role = role;
    }

    // Filter by active status
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // Search functionality
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      message: 'Server error'
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Users can only view their own profile or managers can view any profile
    if (req.user.role !== 'manager' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({
        message: 'Not authorized to view this user'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      message: 'Server error'
    });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user (managers only)
// @access  Private (Managers only)
router.put('/:id', protect, authorize('manager'), [
  body('firstName')
    .optional()
    .notEmpty()
    .withMessage('First name cannot be empty'),
  body('lastName')
    .optional()
    .notEmpty()
    .withMessage('Last name cannot be empty'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please enter a valid email'),
  body('role')
    .optional()
    .isIn(['manager', 'team_lead', 'team_member'])
    .withMessage('Invalid role'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
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

    const { firstName, lastName, email, role, isActive } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Check if email is already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ 
        email, 
        _id: { $ne: req.params.id } 
      });
      
      if (existingUser) {
        return res.status(400).json({
          message: 'Email is already taken'
        });
      }
    }

    const updateFields = {};
    if (firstName) updateFields.firstName = firstName;
    if (lastName) updateFields.lastName = lastName;
    if (email) updateFields.email = email;
    if (role) updateFields.role = role;
    if (isActive !== undefined) updateFields.isActive = isActive;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user (managers only)
// @access  Private (Managers only)
router.delete('/:id', protect, authorize('manager'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Check if user is trying to delete themselves
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({
        message: 'Cannot delete your own account'
      });
    }

    // Check if user has any projects as manager
    const Project = require('../models/Project');
    const projectCount = await Project.countDocuments({ manager: req.params.id });

    if (projectCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete user who is managing projects. Please reassign projects first.'
      });
    }

    // Check if user has any tasks
    const Task = require('../models/Task');
    const taskCount = await Task.countDocuments({
      $or: [
        { assignedTo: req.params.id },
        { createdBy: req.params.id }
      ]
    });

    if (taskCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete user who has assigned or created tasks. Please reassign tasks first.'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      message: 'Server error'
    });
  }
});

// @route   GET /api/users/search/team-members
// @desc    Search for team members (for project assignment)
// @access  Private
router.get('/search/team-members', protect, async (req, res) => {
  try {
    const { search, excludeProject } = req.query;

    let query = { isActive: true };

    // Exclude users already in a specific project
    if (excludeProject) {
      const Project = require('../models/Project');
      const project = await Project.findById(excludeProject);
      if (project) {
        const existingMemberIds = project.teamMembers.map(member => member.user.toString());
        query._id = { $nin: existingMemberIds };
      }
    }

    // Search functionality
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('firstName lastName email username role')
      .limit(20)
      .sort({ firstName: 1, lastName: 1 });

    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Search team members error:', error);
    res.status(500).json({
      message: 'Server error'
    });
  }
});

// @route   GET /api/users/stats/overview
// @desc    Get user statistics (managers only)
// @access  Private (Managers only)
router.get('/stats/overview', protect, authorize('manager'), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const managers = await User.countDocuments({ role: 'manager' });
    const teamLeads = await User.countDocuments({ role: 'team_lead' });
    const teamMembers = await User.countDocuments({ role: 'team_member' });

    // Recent registrations
    const recentUsers = await User.find()
      .select('firstName lastName email role createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        managers,
        teamLeads,
        teamMembers
      },
      recentUsers
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      message: 'Server error'
    });
  }
});

module.exports = router; 