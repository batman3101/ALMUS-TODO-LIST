import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

// Utility function to safely access localStorage
const safeLocalStorageGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn('Failed to read from localStorage:', error);
    return null;
  }
};

const safeLocalStorageSet = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn('Failed to write to localStorage:', error);
  }
};

// Custom hook to detect system theme preference
const useSystemTheme = () => {
  const [systemTheme, setSystemTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    // Use the newer addEventListener if available, fallback to addListener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else if (mediaQuery.addListener) {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  return systemTheme;
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemTheme = useSystemTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setThemeState] = useState<Theme>('light');

  // Initialize theme asynchronously to prevent blocking
  useEffect(() => {
    const initializeTheme = () => {
      const savedTheme = safeLocalStorageGet('almus-theme') as Theme;
      const initialTheme = savedTheme || systemTheme;
      
      setThemeState(initialTheme);
      setIsLoading(false);
    };

    // Use requestAnimationFrame to ensure non-blocking initialization
    const raf = requestAnimationFrame(initializeTheme);
    return () => cancelAnimationFrame(raf);
  }, [systemTheme]);

  // Apply theme to DOM with batched updates
  useEffect(() => {
    if (isLoading) return;

    const updateTheme = () => {
      const root = document.documentElement;
      
      // Batch DOM updates
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
      
      // Update meta theme-color for mobile browsers
      const themeColorMeta = document.querySelector('meta[name="theme-color"]');
      if (themeColorMeta) {
        themeColorMeta.setAttribute('content', theme === 'dark' ? '#1f2937' : '#ffffff');
      }
      
      // Save to localStorage asynchronously
      requestIdleCallback(() => {
        safeLocalStorageSet('almus-theme', theme);
      }, { timeout: 1000 });
    };

    // Use requestAnimationFrame for smooth theme transitions
    const raf = requestAnimationFrame(updateTheme);
    return () => cancelAnimationFrame(raf);
  }, [theme, isLoading]);

  // Auto-update theme when system preference changes (if user hasn't set manual preference)
  useEffect(() => {
    const savedTheme = safeLocalStorageGet('almus-theme');
    
    // Only auto-update if user hasn't manually set a preference
    if (!savedTheme && systemTheme !== theme) {
      setThemeState(systemTheme);
    }
  }, [systemTheme, theme]);

  const toggleTheme = useCallback(() => {
    setThemeState(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    if (newTheme !== theme) {
      setThemeState(newTheme);
    }
  }, [theme]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo((): ThemeContextType => ({
    theme,
    toggleTheme,
    setTheme,
    isLoading,
  }), [theme, toggleTheme, setTheme, isLoading]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Performance monitoring hook for theme changes
export const useThemePerformance = () => {
  const { theme } = useTheme();
  
  useEffect(() => {
    const markName = `theme-change-${theme}`;
    performance.mark(markName);
    
    // Measure time from app start to theme change
    try {
      performance.measure(`theme-${theme}`, 'navigationStart', markName);
    } catch (error) {
      // Ignore if navigationStart is not available
    }
  }, [theme]);
};