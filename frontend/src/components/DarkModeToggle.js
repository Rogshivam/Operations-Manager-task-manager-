import React from 'react';
import { FiSun, FiMoon } from 'react-icons/fi';
import { useDarkMode } from '../contexts/DarkModeContext';
import './DarkModeToggle.css';

const DarkModeToggle = ({ className = '' }) => {
    const { isDarkMode, toggleDarkMode } = useDarkMode();

    return (
        <button 
            className={`dark-mode-toggle ${className}`}
            onClick={toggleDarkMode}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            {isDarkMode ? <FiSun /> : <FiMoon />}
        </button>
    );
};

export default DarkModeToggle; 