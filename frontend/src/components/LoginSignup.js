// LoginSignup.js
import React, { useState } from 'react';
import DarkModeToggle from './DarkModeToggle';
import './LoginSignup.css';
import logo from '../assets/TodoLogo.png';
import { useAuth } from '../contexts/AuthContext';

const LoginSignup = () => {
  const { login, register } = useAuth();
  const [isLoginSelected, setIsLoginSelected] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('team_member');
  const [loading, setLoading] = useState(false);

  const handleToggle = () => {
    setIsLoginSelected(!isLoginSelected);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLoginSelected) {
        const result = await login({ email, password });
        if (!result.success) throw new Error(result.error || 'Invalid email or password');
      } else {
        const result = await register({ username, email, password, firstName, lastName, role });
        if (!result.success) throw new Error(result.error || 'Signup failed');
        setIsLoginSelected(true);
        setUsername('');
        setPassword('');
        setEmail('');
        setFirstName('');
        setLastName('');
        setRole('team_member');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="authPage">
      <div className="auth-header">
        <img src={logo} className="logo" alt="Todo Logo" />
        <DarkModeToggle />
      </div>

      <div className="toggleButtons">
        <button onClick={handleToggle} className={isLoginSelected ? 'active' : ''}>
          Login
        </button>
        <button onClick={handleToggle} className={!isLoginSelected ? 'active' : ''}>
          Signup
        </button>
      </div>

      <form onSubmit={handleFormSubmit} className="authform">
        {isLoginSelected ? (
          <>
            <input
              type="email"
              placeholder="Enter Email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Enter Password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </>
        ) : (
          <>
            <input
              type="text"
              placeholder="Enter Username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <input
              type="email"
              placeholder="Enter Email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="First Name"
              name="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Last Name"
              name="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Enter Password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <select
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            >
              <option value="team_member">Team Member</option>
              <option value="team_lead">Team Lead</option>
              <option value="manager">Manager</option>
            </select>
          </>
        )}
        <button type="submit" disabled={loading}>
          {loading ? 'Please wait...' : isLoginSelected ? 'Login' : 'Signup'}
        </button>
      </form>
    </div>
  );
};

export default LoginSignup;
