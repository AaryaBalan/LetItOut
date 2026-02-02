import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme !== null) {
        setIsDark(savedTheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDark;
      setIsDark(newTheme);
      await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const theme = {
    // Background colors
    background: isDark ? '#000000' : '#F5F5F5',
    surface: isDark ? '#0A0A0A' : '#FFFFFF',
    card: isDark ? '#1A1A1A' : '#FFFFFF',
    cardElevated: isDark ? '#1F1F1F' : '#FFFFFF',

    // Text colors
    text: isDark ? '#FFFFFF' : '#212121',
    textSecondary: isDark ? '#AAAAAA' : '#757575',
    textTertiary: isDark ? '#888888' : '#9E9E9E',

    // Border colors
    border: isDark ? '#2A2A2A' : '#E0E0E0',
    divider: isDark ? '#1A1A1A' : '#F5F5F5',

    // Primary colors
    primary: '#9575cd',
    primaryLight: isDark ? '#B39DDB' : '#9575cd',
    primaryDark: '#7E57C2',

    // Status colors
    success: '#4CAF50',
    error: '#F44336',
    warning: '#FF9800',
    info: '#2196F3',

    // Input colors
    input: isDark ? '#1A1A1A' : '#F5F5F5',
    inputBorder: isDark ? '#2A2A2A' : '#E0E0E0',
    placeholder: isDark ? '#555555' : '#BDBDBD',

    // Other
    shadow: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.1)',
    overlay: 'rgba(0,0,0,0.7)',

    // Status bar
    statusBar: isDark ? 'light-content' : 'dark-content',

    // Helper
    isDark,
  };

  const value = {
    isDark,
    theme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
