// LoginSignup.js
import React, { useState } from 'react';
import DarkModeToggle from './DarkModeToggle';
import './LoginSignup.css';
import logo from '../assets/TodoLogo.png';

const LoginSignup = ({ onLogin }) => {
    const [isLoginSelected, setIsLoginSelected] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('team_member');

    const handleToggle = () => {
        setIsLoginSelected(!isLoginSelected);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'username') {
            setUsername(value);
        } else if (name === 'password') {
            setPassword(value);
        } else if (name === 'email') {
            setEmail(value);
        } else if (name === 'role') {
            setRole(value);
        }
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        
        if (isLoginSelected) {
            // Login logic
            const allUsers = JSON.parse(localStorage.getItem('allusers')) || [];
            const user = allUsers.find(user => user.username === username && user.password === password);
            
            if (user) {
                alert('Login successful');
                onLogin(user);
            } else {
                alert('Invalid username or password');
            }
        } else {
            // Signup logic
            const allUsers = JSON.parse(localStorage.getItem('allusers')) || [];
            const userExists = allUsers.some(user => user.username === username);
            
            if (userExists) {
                alert('Username already exists. Please choose a different one.');
            } else {
                const newUser = {
                    id: Date.now(),
                    username: username,
                    password: password,
                    email: email,
                    role: role,
                    createdAt: new Date().toISOString()
                };
                
                localStorage.setItem('allusers', JSON.stringify([...allUsers, newUser]));
                alert('Signup successful! Please login.');
                setIsLoginSelected(true);
                setUsername('');
                setPassword('');
                setEmail('');
                setRole('team_member');
            }
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
                <input
                    type="text"
                    placeholder="Enter username"
                    name="username"
                    value={username}
                    onChange={handleInputChange}
                    required
                />
                <input
                    type="password"
                    placeholder="Enter Password"
                    name="password"
                    value={password}
                    onChange={handleInputChange}
                    required
                />
                {!isLoginSelected && (
                    <>
                        <input
                            type="email"
                            placeholder="Enter Email"
                            name="email"
                            value={email}
                            onChange={handleInputChange}
                            required
                        />
                        <select
                            name="role"
                            value={role}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="team_member">Team Member</option>
                            <option value="team_lead">Team Lead</option>
                            <option value="manager">Manager</option>
                        </select>
                    </>
                )}
                <button type="submit">{isLoginSelected ? 'Login' : 'Signup'}</button>
            </form>
        </div>
    );
};

export default LoginSignup;
