import React, { createContext, useContext } from 'react';

// Create the context
export const ThemeContext = createContext();

// Custom hook for using theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};