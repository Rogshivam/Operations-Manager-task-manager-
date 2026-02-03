import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Main from './components/Main';
import LoginSignup from './components/LoginSignup';
import ProjectDashboard from './components/ProjectDashboard';
import ProjectDetails from './components/ProjectDetails';
import TeamManagement from './components/TeamManagement';
import { DarkModeProvider } from './contexts/DarkModeContext';
import { useAuth } from './contexts/AuthContext';
import './App.css';

const App = () => {
  const { user, isAuthenticated, loading, logout } = useAuth();

  if (loading) return <div>Loading...</div>;

  return (
    <DarkModeProvider>
      <Router>
        <div className="App">
          {isAuthenticated ? (
            <Routes>
              <Route path="/dashboard/:projectId" element={<ProjectDashboard currentUser={user} onLogout={logout} />} />
              <Route path="/project/:projectId" element={<ProjectDetails currentUser={user} onLogout={logout} />} />
              <Route path="/project/team/:projectId" element={<TeamManagement currentUser={user} onLogout={logout} />} />
              <Route path="/tasks" element={<Main currentUser={user} onLogout={logout} />} />
              <Route path="/" element={<Navigate to="/dashboard/:projectId" replace currentUser={user} onLogout={logout}/>} />
            </Routes>
          ) : (
            <LoginSignup />
          )}
        </div>
      </Router>
    </DarkModeProvider>
  );
};

export default App;
