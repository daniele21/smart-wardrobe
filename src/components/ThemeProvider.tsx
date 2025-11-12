import React, { useEffect, ReactNode } from 'react';
import { theme } from '../theme';

interface ThemeProviderProps {
  children: ReactNode;
}

const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  useEffect(() => {
    const root = document.documentElement;

    // Apply colors as CSS variables
    Object.entries(theme.colors).forEach(([name, value]) => {
      root.style.setProperty(`--${name}`, value);
    });

    // Apply fonts as CSS variables
    Object.entries(theme.fonts).forEach(([name, value]) => {
      root.style.setProperty(`--font-${name}`, value);
    });
  }, []);

  return <>{children}</>;
};

export default ThemeProvider;
