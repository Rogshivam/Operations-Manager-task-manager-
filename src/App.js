import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Main from './components/Main';
import LoginSignup from './components/LoginSignup';
import ProjectDashboard from './components/ProjectDashboard';
import ProjectDetails from './components/ProjectDetails';
import TeamManagement from './components/TeamManagement';
import { DarkModeProvider } from './contexts/DarkModeContext';
import './App.css';

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = (user) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    localStorage.setItem('currentUser', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsLoggedIn(false);
    localStorage.removeItem('currentUser');
  };

  return (
    <DarkModeProvider>
      <Router>
        <div className="App">
          {isLoggedIn ? (
            <Routes>
              <Route path="/dashboard" element={<ProjectDashboard currentUser={currentUser} onLogout={handleLogout} />} />
              <Route path="/project/:projectId" element={<ProjectDetails currentUser={currentUser} onLogout={handleLogout} />} />
              <Route path="/team/:projectId" element={<TeamManagement currentUser={currentUser} onLogout={handleLogout} />} />
              <Route path="/tasks" element={<Main currentUser={currentUser} onLogout={handleLogout} />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          ) : (
            <LoginSignup onLogin={handleLogin} />
          )}
        </div>
      </Router>
    </DarkModeProvider>
  );
};

export default App;
