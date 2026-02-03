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
// middleware/auth.js - FIX isProjectManagerOrLead
const isProjectManagerOrLead = async (req, res, next) => {
  try {

    
    // ✅ FIX: Check BODY first, then params
    const projectId = req.body.projectId || req.params.projectId || req.params.id;
    const userId = req.user._id.toString();

    if (!projectId) {
      return res.status(400).json({ message: 'Project ID required' });
    }

    const Project = require('../models/Project');
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    

    // Check manager (handle ObjectId or populated User)
    const managerId = project.manager?._id?.toString() || project.manager?.toString();
    if (managerId === userId) {
      return next();
    }

    // Check team lead
    if (project.teamLead?.toString() === userId) {
      return next();
    }

    return res.status(403).json({ 
      message: 'Not project manager or team lead',
      userId, 
      managerId 
    });
  } catch (error) {
    console.error('🚨 isProjectManagerOrLead ERROR:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};


// Check if user is project manager
const isProjectManager = async (req, res, next) => {
  try {
    const projectId = req.params.id || req.body.projectId;  // ✅ Handle both
    const userId = req.user._id.toString();

   

    const Project = require('../models/Project');
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // ✅ SAFE: Handle ObjectId OR populated User object
    const managerId = project.manager;
    let managerIdString;

    if (managerId && typeof managerId === 'object') {
      // Populated User object
      managerIdString = managerId._id?.toString();
    } else {
      // Raw ObjectId
      managerIdString = managerId?.toString();
    }

    

    if (managerIdString !== userId) {
      return res.status(403).json({ 
        message: 'Only project manager can perform this action',
        currentUser: userId,
        projectManager: managerIdString
      });
    }

    next();
  } catch (error) {
    console.error('🚨 isProjectManager ERROR:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};



// Check if user is task assignee or creator
// ✅ FIXED: Handle populated User objects safely
const isTaskAssigneeOrCreator = async (req, res, next) => {
  try {
    // ✅ FIX: req.params.id (NOT taskId!)
    const taskId = req.params.id;  // From /:id routes
    const userId = req.user._id.toString();
    
    // console.log('🔍 isTaskAssigneeOrCreator:', { taskId, userId });

    if (!taskId) {
      return res.status(400).json({ 
        message: 'Task ID required', 
        params: req.params 
      });
    }

    const Task = require('../models/Task');
    const task = await Task.findById(taskId).populate('project');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // ✅ SAFE User ID extraction
    const getUserIdSafe = (userField) => {
      if (!userField) return null;
      if (typeof userField === 'object' && userField._id) {
        return userField._id.toString();
      }
      return userField.toString();
    };

    const assignedToId = getUserIdSafe(task.assignedTo);
    const createdById = getUserIdSafe(task.createdBy);
    
    // console.log('Task auth:', { assignedToId, createdById, userId });

    // Check assignee/creator
    if (assignedToId === userId || createdById === userId) {
      return next();
    }

    // Check project manager/team lead
    const project = task.project;
    if (project) {
      const managerId = getUserIdSafe(project.manager);
      const teamLeadId = getUserIdSafe(project.teamLead);
      
      if (managerId === userId || teamLeadId === userId) {
        return next();
      }
    }

    return res.status(403).json({ 
      message: 'Not authorized',
      userId, assignedToId, createdById 
    });

  } catch (error) {
    console.error('🚨 isTaskAssigneeOrCreator ERROR:', error);
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