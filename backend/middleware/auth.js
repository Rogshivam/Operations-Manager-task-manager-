const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  let token;

  // Prefer Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Fallback to cookie
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }

    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

// Authorize roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `User role ${req.user.role} is not authorized to access this route` 
      });
    }

    next();
  };
};

// Check if user is project manager or team lead
const isProjectManagerOrLead = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const userId = req.user._id;

    const Project = require('../models/Project');
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is the project manager
    if (project.manager.toString() === userId.toString()) {
      return next();
    }

    // Check if user is the team lead
    if (project.teamLead && project.teamLead.toString() === userId.toString()) {
      return next();
    }

    // Check if user is a team member with team_lead role
    const teamMember = project.teamMembers.find(
      member => member.user.toString() === userId.toString() && member.role === 'team_lead'
    );

    if (teamMember) {
      return next();
    }

    return res.status(403).json({ message: 'Not authorized to perform this action' });
  } catch (error) {
    console.error('Authorization error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Check if user is project manager
// const isProjectManager = async (req, res, next) => {
//   try {
//     const { projectId } = req.params;
//     const userId = req.user._id;

//     const Project = require('../models/Project');
//     const project = await Project.findById(projectId);

//     if (!project) {
//       return res.status(404).json({ message: 'Project not found' });
//     }

//     if (project.manager.toString() !== userId.toString()) {
//       return res.status(403).json({ message: 'Only project manager can perform this action' });
//     }

//     next();
//   } catch (error) {
//     console.error('Authorization error:', error);
//     return res.status(500).json({ message: 'Server error' });
//   }
// };
const isProjectManager = async (req, res, next) => {
  try {
    // ✅ FIX: Use req.params.id, NOT req.params.projectId
    const projectId = req.params.id;  // From /projects/:id/team-members
    const userId = req.user._id;

    // console.log('Checking manager:', { projectId, userId }); // Debug

    const Project = require('../models/Project');
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.manager.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only project manager can perform this action' });
    }

    next();
  } catch (error) {
    // console.error('Authorization error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};


// Check if user is task assignee or creator
const isTaskAssigneeOrCreator = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const userId = req.user._id;

    const Task = require('../models/Task');
    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user is the task assignee or creator
    if (task.assignedTo.toString() === userId.toString() || 
        task.createdBy.toString() === userId.toString()) {
      return next();
    }

    // Check if user is project manager or team lead
    const Project = require('../models/Project');
    const project = await Project.findById(task.project);

    if (project.manager.toString() === userId.toString() || 
        (project.teamLead && project.teamLead.toString() === userId.toString())) {
      return next();
    }

    return res.status(403).json({ message: 'Not authorized to perform this action' });
  } catch (error) {
    console.error('Authorization error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  protect,
  authorize,
  isProjectManagerOrLead,
  isProjectManager,
  isTaskAssigneeOrCreator
}; 