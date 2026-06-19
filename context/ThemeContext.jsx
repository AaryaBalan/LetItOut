import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);
  const [themeLoaded, setThemeLoaded] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme !== null) {
        setIsDark(savedTheme === 'dark');
      } else {
        // Default to light mode if no preference is saved
        setIsDark(false);
        await AsyncStorage.setItem('theme', 'light');
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setThemeLoaded(true);
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
    background: isDark ? '#000000' : '#F9FAFB',
    surface: isDark ? '#0A0A0A' : '#FFFFFF',
    card: isDark ? '#1A1A1A' : '#FFFFFF',
    cardElevated: isDark ? '#1F1F1F' : '#FFFFFF',

    // Text colors
    text: isDark ? '#FFFFFF' : '#111827',
    textSecondary: isDark ? '#AAAAAA' : '#6B7280',
    textTertiary: isDark ? '#888888' : '#9CA3AF',

    // Border colors
    border: isDark ? '#2A2A2A' : '#E5E7EB',
    divider: isDark ? '#1A1A1A' : '#F3F4F6',

    // Primary colors (Now Black for main action buttons to match design)
    primary: isDark ? '#FFFFFF' : '#111827',
    primaryLight: isDark ? '#E5E7EB' : '#374151',
    primaryDark: isDark ? '#D1D5DB' : '#000000',

    // Accent colors (The vibrant purple/indigo from the design)
    accent: '#6366F1',
    accentLight: '#818CF8',
    accentDark: '#4F46E5',

    // Status colors
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',

    // Input colors
    input: isDark ? '#1A1A1A' : '#F3F4F6',
    inputBorder: isDark ? '#2A2A2A' : '#E5E7EB',
    placeholder: isDark ? '#555555' : '#9CA3AF',

    // Other
    shadow: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.05)',
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
    themeLoaded,
  };

  // Don't render children until theme is loaded
  if (!themeLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
