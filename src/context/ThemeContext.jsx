import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    // Check local storage or system preference
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('theme');
        if (saved) {
            return saved === 'dark';
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    useEffect(() => {
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');

        // Apply theme to body for global styles
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
            document.body.style.backgroundColor = '#1a1b1e'; // Dark background
            document.body.style.color = '#e0e0e0'; // Light text
        } else {
            document.body.classList.remove('dark-mode');
            document.body.style.backgroundColor = '#f8f9fa'; // Light background
            document.body.style.color = '#212529'; // Dark text
        }
    }, [isDarkMode]);

    const toggleTheme = () => {
        setIsDarkMode(prev => !prev);
    };

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
