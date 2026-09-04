import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getOnboardingStatus,
  saveWorkspaceBusinessProfile,
  connectWorkspaceRazorpay,
  createWorkspaceTestScenario,
  getRazorpayStatus,
  switchEnvironment,
} from '../api/client';

export type AppMode = 'demo' | 'real';

export type OnboardingState =
  | 'NEW_USER'
  | 'PROFILE_INCOMPLETE'
  | 'RAZORPAY_NOT_CONNECTED'
  | 'RAZORPAY_CONNECTING'
  | 'RAZORPAY_CONNECTED'
  | 'INITIAL_SYNC'
  | 'WORKSPACE_READY'
  | 'SYNC_ERROR'
  | 'INTEGRATION_ERROR';

export interface WorkspaceProfile {
  id: string;
  name: string;
  business_type: string;
  industry: string;
  currency: string;
  country: string;
  monthly_gmv_inr: number;
  average_order_value_inr: number;
  primary_recovery_goals: string;
  primary_payment_types: string;
  business_size: string;
  onboarding_state: OnboardingState;
  onboarding_complete: boolean;
}

export interface RazorpayConnectionStatus {
  connected: boolean;
  is_configured: boolean;
  environment: string;
  key_id_masked: string;
}

export interface DataCounts {
  payments: number;
  subscriptions: number;
  invoices: number;
  recovery_cases: number;
}

interface WorkspaceContextType {
  currentMode: AppMode;
  isDemoMode: boolean;
  isRealMode: boolean;
  setMode: (mode: AppMode) => Promise<void>;
  toggleMode: () => Promise<void>;
  isSwitching: boolean;
  isLoading: boolean;
  workspace: WorkspaceProfile | null;
  onboardingState: OnboardingState;
  razorpayStatus: RazorpayConnectionStatus;
  dataCounts: DataCounts;
  syncStatus: {
    is_syncing: boolean;
    last_synced_at: string | null;
  };
  refreshWorkspace: () => Promise<void>;
  saveProfile: (data: {
    business_name: string;
    business_type: string;
    industry?: string;
    currency?: string;
    country?: string;
    monthly_gmv_inr?: number;
    average_order_value_inr?: number;
    primary_recovery_goals?: string;
    primary_payment_types?: string;
  }) => Promise<any>;
  connectRazorpay: (data: {
    key_id: string;
    key_secret: string;
    environment?: string;
    webhook_secret?: string;
  }) => Promise<any>;
  createTestScenario: () => Promise<any>;
  logout: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const MODE_STORAGE_KEY = 'revive_app_mode';
const LEGACY_DEMO_KEY = 'revive_demo_mode';
const ENV_STORAGE_KEY = 'reviveai_active_environment';

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentMode, setCurrentModeState] = useState<AppMode>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(MODE_STORAGE_KEY) : null;
    if (saved === 'real') return 'real';
    if (saved === 'demo') return 'demo';
    const env = typeof window !== 'undefined' ? localStorage.getItem(ENV_STORAGE_KEY) : null;
    if (env === 'RAZORPAY_TEST' || env === 'RAZORPAY_LIVE' || env === 'REAL') return 'real';
    return 'demo';
  });

  const [isSwitching, setIsSwitching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [workspace, setWorkspace] = useState<WorkspaceProfile | null>(null);
  const [onboardingState, setOnboardingState] = useState<OnboardingState>('NEW_USER');
  const [razorpayStatus, setRazorpayStatus] = useState<RazorpayConnectionStatus>({
    connected: false,
    is_configured: false,
    environment: 'none',
    key_id_masked: '',
  });
  const [dataCounts, setDataCounts] = useState<DataCounts>({
    payments: 0,
    subscriptions: 0,
    invoices: 0,
    recovery_cases: 0,
  });
  const [syncStatus, setSyncStatus] = useState<{ is_syncing: boolean; last_synced_at: string | null }>({
    is_syncing: false,
    last_synced_at: null,
  });

  const refreshWorkspace = useCallback(async () => {
    try {
      setIsLoading(true);
      const [onboardRes, rzpRes] = await Promise.all([
        getOnboardingStatus().catch(() => null),
        getRazorpayStatus().catch(() => null),
      ]);

      if (onboardRes) {
        setWorkspace(onboardRes.workspace);
        setOnboardingState(onboardRes.state as OnboardingState);
        if (onboardRes.data_counts) {
          setDataCounts(onboardRes.data_counts);
        }
        if (onboardRes.sync) {
          setSyncStatus(onboardRes.sync);
        }
      }

      if (rzpRes) {
        setRazorpayStatus({
          connected: Boolean(rzpRes.is_configured),
          is_configured: Boolean(rzpRes.is_configured),
          environment: rzpRes.credentials?.environment || rzpRes.active_environment || 'none',
          key_id_masked: rzpRes.credentials?.key_id_masked || '',
        });
      }
    } catch (err) {
      console.error('[WorkspaceContext] Refresh error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshWorkspace();
  }, [refreshWorkspace, currentMode]);

  const setMode = useCallback(async (newMode: AppMode) => {
    if (isSwitching) return;
    setIsSwitching(true);
    try {
      setCurrentModeState(newMode);
      localStorage.setItem(MODE_STORAGE_KEY, newMode);

      if (newMode === 'real') {
        localStorage.setItem(ENV_STORAGE_KEY, 'RAZORPAY_TEST');
        localStorage.removeItem(LEGACY_DEMO_KEY);
        try {
          await switchEnvironment('RAZORPAY_TEST');
        } catch (_) {}
      } else {
        localStorage.setItem(LEGACY_DEMO_KEY, 'true');
        localStorage.setItem(ENV_STORAGE_KEY, 'DEMO');
        try {
          await switchEnvironment('DEMO');
        } catch (_) {}
      }

      window.dispatchEvent(new CustomEvent('revive_mode_changed', { detail: { mode: newMode } }));
      await refreshWorkspace();
    } finally {
      setIsSwitching(false);
    }
  }, [isSwitching, refreshWorkspace]);

  const toggleMode = useCallback(async () => {
    const next = currentMode === 'demo' ? 'real' : 'demo';
    await setMode(next);
  }, [currentMode, setMode]);

  const saveProfile = useCallback(async (data: any) => {
    const res = await saveWorkspaceBusinessProfile(data);
    await refreshWorkspace();
    return res;
  }, [refreshWorkspace]);

  const connectRazorpay = useCallback(async (data: any) => {
    const res = await connectWorkspaceRazorpay(data);
    await refreshWorkspace();
    return res;
  }, [refreshWorkspace]);

  const createTestScenario = useCallback(async () => {
    const res = await createWorkspaceTestScenario();
    await refreshWorkspace();
    return res;
  }, [refreshWorkspace]);

  const logout = useCallback(() => {
    localStorage.removeItem(MODE_STORAGE_KEY);
    localStorage.removeItem(LEGACY_DEMO_KEY);
    localStorage.removeItem(ENV_STORAGE_KEY);
    localStorage.removeItem('revive_session_active');
    localStorage.removeItem('revive_onboarded');
    setWorkspace(null);
    setOnboardingState('NEW_USER');
  }, []);

  const value: WorkspaceContextType = {
    currentMode,
    isDemoMode: currentMode === 'demo',
    isRealMode: currentMode === 'real',
    setMode,
    toggleMode,
    isSwitching,
    isLoading,
    workspace,
    onboardingState,
    razorpayStatus,
    dataCounts,
    syncStatus,
    refreshWorkspace,
    saveProfile,
    connectRazorpay,
    createTestScenario,
    logout,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

export const useWorkspace = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
