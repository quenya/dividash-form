import React, { createContext, useContext, useState, useEffect } from 'react';
import { getChartTheme } from '../utils/chartTheme';

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

        // Colors come from the CSS tokens in styles/App.css; only the class switches here.
        document.body.classList.toggle('dark-mode', isDarkMode);
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

// Chart colors for the current theme. Falls back to light outside a ThemeProvider (tests).
export function useChartTheme() {
    const theme = useContext(ThemeContext);
    return getChartTheme(Boolean(theme?.isDarkMode));
}
