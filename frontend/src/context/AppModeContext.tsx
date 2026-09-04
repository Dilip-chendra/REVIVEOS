import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { switchEnvironment } from '../api/client';

export type AppMode = 'demo' | 'real';

interface AppModeContextType {
  currentMode: AppMode;
  isDemoMode: boolean;
  isRealMode: boolean;
  setMode: (mode: AppMode) => Promise<void>;
  toggleMode: () => Promise<void>;
  isSwitching: boolean;
}

const AppModeContext = createContext<AppModeContextType | undefined>(undefined);

const MODE_STORAGE_KEY = 'revive_app_mode';
const LEGACY_DEMO_KEY = 'revive_demo_mode';
const ENV_STORAGE_KEY = 'reviveai_active_environment';

export const AppModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentMode, setCurrentModeState] = useState<AppMode>(() => {
    // 1. Check canonical storage key first
    const saved = localStorage.getItem(MODE_STORAGE_KEY);
    if (saved === 'real') return 'real';
    if (saved === 'demo') return 'demo';

    // 2. Check legacy environment storage key
    const env = localStorage.getItem(ENV_STORAGE_KEY);
    if (env === 'RAZORPAY_TEST' || env === 'RAZORPAY_LIVE' || env === 'REAL') {
      return 'real';
    }

    // 3. Check legacy demo mode flag
    const isLegacyDemo = localStorage.getItem(LEGACY_DEMO_KEY) === 'true';
    if (isLegacyDemo) return 'demo';

    // Default to demo universe for clean unauthenticated preview
    return 'demo';
  });

  const [isSwitching, setIsSwitching] = useState(false);

  // Sync mode transitions across storage and backend
  const setMode = useCallback(async (newMode: AppMode) => {
    if (isSwitching) return;
    setIsSwitching(true);

    try {
      setCurrentModeState(newMode);
      localStorage.setItem(MODE_STORAGE_KEY, newMode);
      if (newMode === 'real') {
        // Strict Real Mode: set real test environment
        localStorage.setItem(ENV_STORAGE_KEY, 'RAZORPAY_TEST');
        localStorage.removeItem(LEGACY_DEMO_KEY);
        try {
          await switchEnvironment('RAZORPAY_TEST');
        } catch (_) {}
      } else {
        // Strict Demo Mode: set demo flags
        localStorage.setItem(LEGACY_DEMO_KEY, 'true');
        localStorage.setItem(ENV_STORAGE_KEY, 'DEMO');
        try {
          await switchEnvironment('DEMO');
        } catch (_) {}
      }

      // Notify any listening components
      window.dispatchEvent(new CustomEvent('revive_mode_changed', { detail: { mode: newMode } }));
    } finally {
      setIsSwitching(false);
    }
  }, [isSwitching]);

  const toggleMode = useCallback(async () => {
    const next = currentMode === 'demo' ? 'real' : 'demo';
    await setMode(next);
  }, [currentMode, setMode]);

  // Synchronize storage on mount
  useEffect(() => {
    localStorage.setItem(MODE_STORAGE_KEY, currentMode);
    if (currentMode === 'real') {
      localStorage.setItem(ENV_STORAGE_KEY, 'RAZORPAY_TEST');
      localStorage.removeItem(LEGACY_DEMO_KEY);
    } else {
      localStorage.setItem(LEGACY_DEMO_KEY, 'true');
      localStorage.setItem(ENV_STORAGE_KEY, 'DEMO');
    }
  }, [currentMode]);

  const value: AppModeContextType = {
    currentMode,
    isDemoMode: currentMode === 'demo',
    isRealMode: currentMode === 'real',
    setMode,
    toggleMode,
    isSwitching,
  };

  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
};

export const useAppMode = (): AppModeContextType => {
  const context = useContext(AppModeContext);
  if (!context) {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(MODE_STORAGE_KEY) : null;
    const mode: AppMode = saved === 'real' ? 'real' : 'demo';
    return {
      currentMode: mode,
      isDemoMode: mode === 'demo',
      isRealMode: mode === 'real',
      setMode: async () => {},
      toggleMode: async () => {},
      isSwitching: false,
    };
  }
  return context;
};
