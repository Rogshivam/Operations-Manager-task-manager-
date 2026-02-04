# Project Collaboration Task Management System

A comprehensive task management and project collaboration tool built with MERN Stack. This application facilitates efficient project management with role-based access control, team collaboration, and real-time task tracking.

## Features

### 🔐 User Management & Authentication
- **User Registration & Login**: Secure authentication system
- **Role-Based Access Control**: Three user roles with different permissions
  - **Manager**: Can create projects, manage teams, and oversee all activities
  - **Team Lead**: Can assign tasks and manage team members
  - **Team Member**: Can update task status and view assigned tasks

### 📊 Project Management
- **Project Creation**: Managers can create new projects with detailed information
- **Project Dashboard**: Overview of all projects with statistics and progress tracking
- **Project Details**: Detailed view of individual projects with task management
- **Project Timeline**: Start and end date tracking for project planning

### 👥 Team Management
- **Team Member Addition**: Managers can add team members to projects
- **Team Lead Assignment**: Designate team leads for project coordination
- **Team Overview**: Visual representation of team structure and roles
- **Member Management**: Add, remove, and reassign team members

### ✅ Task Management
- **Task Creation**: Create tasks with title, description, priority, and due dates
- **Task Assignment**: Assign tasks to specific team members
- **Status Tracking**: Real-time status updates (Pending, In Progress, Completed)
- **Priority Levels**: High, Medium, Low priority classification
- **Task Filtering**: Filter tasks by status and completion

### 📱 Modern UI/UX
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Modern Interface**: Clean, intuitive design with smooth animations
- **Real-time Updates**: Instant feedback for all user actions
- **Visual Indicators**: Color-coded status and priority indicators

## Technology Stack

- **Frontend**: React 18.3.1
- **Routing**: React Router DOM 6.8.0           
- **Icons**: React Icons 4.8.0
- **Styling**: CSS3 with modern design patterns
- **Storage**: Local Storage for data persistence
- **Build Tool**: Create React App

## Getting Started

### Prerequisites
- Node.js (version 14 or higher)
- npm (comes with Node.js)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Rogshivam/Operations-Manager-task-manager-.git
   cd taskManagerReactjs
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

### Building for Production

```bash
npm run build
```

## Usage Guide

### For Managers

1. **Create an Account**: Sign up with the "Manager" role
2. **Create Projects**: Use the "Create Project" button on the dashboard
3. **Add Team Members**: Navigate to "Manage Team" for each project
4. **Monitor Progress**: View project statistics and task completion rates

### For Team Leads

1. **Join Projects**: Get added to projects by managers
2. **Assign Tasks**: Create and assign tasks to team members
3. **Track Progress**: Monitor task completion and team performance

### For Team Members

1. **View Assigned Tasks**: See tasks assigned to you
2. **Update Status**: Change task status as you work on them
3. **Track Progress**: Monitor your task completion

## Project Structure

```
src/
├── components/
│   ├── LoginSignup.js          # Authentication component
│   ├── Main.js                 # Personal tasks management
│   ├── ProjectDashboard.js     # Project overview dashboard
│   ├── ProjectDetails.js       # Individual project view
│   ├── TeamManagement.js       # Team management interface
│   ├── Task.js                 # Individual task component
│   ├── TaskForm.js             # Task creation/editing form
│   └── *.css                   # Component-specific styles
├── assets/
│   ├── colorCodes.js           # Color scheme definitions
│   └── TodoLogo.png            # Application logo
├── App.js                      # Main application component
├── App.css                     # Global styles
└── index.js                    # Application entry point
```

## Data Structure

### User Object
```javascript
{
  id: number,
  username: string,
  password: string,
  email: string,
  role: 'manager' | 'team_lead' | 'team_member',
  createdAt: string
}
```

### Project Object
```javascript
{
  id: number,
  name: string,
  description: string,
  startDate: string,
  endDate: string,
  managerId: number,
  managerName: string,
  teamMembers: User[],
  teamLead: User | null,
  tasks: Task[],
  status: 'active' | 'completed' | 'paused',
  createdAt: string
}
```

### Task Object
```javascript
{
  id: number,
  title: string,
  description: string,
  assignedTo: string,
  priority: 'high' | 'medium' | 'low',
  status: 'pending' | 'in_progress' | 'completed',
  dueDate: string,
  createdBy: number,
  createdAt: string,
  updatedAt: string
}
```

## Features in Detail

### Role-Based Permissions

|    Feature        |      Manager|    Team Lead   | Team Member     |
|-------------------|-------------|----------------|-----------------|
| Create Projects   |      ✅     |       ❌      |     ❌         |
| Add Team Members  |      ✅     |       ❌      |     ❌         |
| Assign Team Lead  |      ✅     |       ❌      |     ❌         |
| Create Tasks      |      ✅     |       ✅      |     ❌         |
| Assign Tasks      |      ✅     |       ✅      |     ❌         |
| Update Task Status|      ✅     |       ✅      | ✅ (own tasks) |
| Delete Tasks      |      ✅     |       ✅      |     ❌         |
| View All Projects |      ✅     | ✅ (assigned) | ✅ (assigned)  |

### Task Status Workflow

1. **Pending**: Newly created task
2. **In Progress**: Task being worked on
3. **Completed**: Task finished

### Priority Levels

- **High**: Critical tasks requiring immediate attention
- **Medium**: Standard priority tasks
- **Low**: Non-urgent tasks

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Future Enhancements

- [*] Real-time collaboration with WebSocket
- [*] File attachments for tasks
- [*] Email notifications
- [*] Advanced reporting and analytics
- [*] Calendar integration
- [*] Mobile app development
- [*] Database integration (MySQL/PostgreSQL)
- [*] User profile management
- [*] Project templates
- [*] Time tracking

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue in the repository or contact the developmer.