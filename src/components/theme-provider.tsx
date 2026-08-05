'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeProviderState>({
  theme: 'dark',
  setTheme: () => null,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored === 'light' || stored === 'dark') {
      setThemeState(stored);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setThemeState('dark');
    } else {
      setThemeState('light');
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    root.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    const handler = (e: MediaQueryListEvent) => {
      setThemeState(e.matches ? 'dark' : 'light');
    };
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const setTheme = (t: Theme) => {
    localStorage.setItem('theme', t);
    setThemeState(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}