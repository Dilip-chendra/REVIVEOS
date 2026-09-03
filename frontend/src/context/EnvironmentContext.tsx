import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getRazorpayStatus, setRazorpayEnvironment } from '../api/client';

export type Environment = 'DEMO' | 'RAZORPAY_LIVE' | 'RAZORPAY_TEST';

interface EnvironmentContextType {
  environment: Environment;
  setEnvironment: (env: Environment) => Promise<void>;
  isProviderMode: boolean;
  isLiveMode: boolean;
  isDemoMode: boolean;
  providerStatus: any;
  reloadProviderStatus: () => Promise<void>;
  badgeLabel: string;
  isTransitioning: boolean;
}

const EnvironmentContext = createContext<EnvironmentContextType | undefined>(undefined);

const STORAGE_KEY = 'reviveai_active_environment';

export const EnvironmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [environment, setEnvironmentState] = useState<Environment>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'RAZORPAY_LIVE' || saved === 'RAZORPAY_TEST') {
      return saved as Environment;
    }
    const appMode = localStorage.getItem('revive_app_mode');
    if (appMode === 'real') {
      return 'RAZORPAY_TEST';
    }
    return 'DEMO';
  });
  const [providerStatus, setProviderStatus] = useState<any>(null);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  const fetchStatus = useCallback(async () => {
    try {
      const status = await getRazorpayStatus();
      setProviderStatus(status);
      if (status?.active_environment) {
        const raw = status.active_environment;
        const env = (raw === 'RAZORPAY_LIVE' || raw === 'RAZORPAY_TEST') ? raw : 'DEMO';
        setEnvironmentState(env);
        localStorage.setItem(STORAGE_KEY, env);
      }
    } catch (e) {
      console.warn('Failed to fetch provider status:', e);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSetEnvironment = async (newEnv: Environment) => {
    setIsTransitioning(true);
    setEnvironmentState(newEnv);
    localStorage.setItem(STORAGE_KEY, newEnv);
    try {
      const res = await setRazorpayEnvironment(newEnv);
      setProviderStatus(res);
      window.dispatchEvent(new Event('revive_environment_changed'));
    } catch (e) {
      console.error('Failed to update environment on backend:', e);
    } finally {
      setTimeout(() => setIsTransitioning(false), 250);
    }
  };

  const isProviderMode = environment === 'RAZORPAY_LIVE';
  const isLiveMode = environment === 'RAZORPAY_LIVE';
  const isDemoMode = environment === 'DEMO';

  const badgeLabel = isDemoMode
    ? 'DEMO SCENARIOS'
    : 'RAZORPAY LIVE (REAL DATA)';

  return (
    <EnvironmentContext.Provider
      value={{
        environment,
        setEnvironment: handleSetEnvironment,
        isProviderMode,
        isLiveMode,
        isDemoMode,
        providerStatus,
        reloadProviderStatus: fetchStatus,
        badgeLabel,
        isTransitioning,
      }}
    >
      {children}
    </EnvironmentContext.Provider>
  );
};

export const useEnvironment = () => {
  const context = useContext(EnvironmentContext);
  if (!context) {
    throw new Error('useEnvironment must be used within an EnvironmentProvider');
  }
  return context;
};