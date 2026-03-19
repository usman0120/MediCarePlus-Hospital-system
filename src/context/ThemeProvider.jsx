import React, { useState, useEffect } from 'react';
import { ThemeContext } from './ThemeContext';
import { useAuth } from '../hooks/useAuth';

export const ThemeProvider = ({ children }) => {
  const { userDetails } = useAuth();
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'light';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Role-based theme colors
  const getRoleTheme = () => {
    if (!userDetails) return 'light';
    
    switch (userDetails.role) {
      case 'patient':
        return 'patient-theme';
      case 'doctor':
        return 'doctor-theme';
      case 'receptionist':
        return 'reception-theme';
      case 'admin':
        return 'admin-theme';
      case 'lab':
        return 'lab-theme';
      default:
        return 'light';
    }
  };

  const value = {
    theme,
    toggleTheme,
    roleTheme: getRoleTheme()
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};