import { useState } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  Zap,
  Sparkles,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';

interface EmptyWorkspaceStateProps {
  onOpenLiveModal?: () => void;
  title?: string;
  subtitle?: string;
}

export default function EmptyWorkspaceState({
  onOpenLiveModal,
  title = "REAL WORKSPACE READY",
  subtitle = "Zero Live Recovery Anomalies Detected • Connected to Razorpay Test Mode",
}: EmptyWorkspaceStateProps) {
  const { razorpayStatus, refreshWorkspace, createTestScenario } = useWorkspace();
  const [refreshing, setRefreshing] = useState(false);
  const [creatingTest, setCreatingTest] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    setSuccessNotice(null);
    try {
      await refreshWorkspace();
      setSuccessNotice("Workspace refreshed — queried latest Razorpay Test API telemetry.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateTest = async () => {
    setCreatingTest(true);
    setSuccessNotice(null);
    try {
      await createTestScenario();
      setSuccessNotice("Created a verified test recovery candidate on your Razorpay rails. Check your dashboard!");
    } catch (err: any) {
      console.error("Failed to create test candidate:", err);
    } finally {
      setCreatingTest(false);
    }
  };

  return (
    <div style={{
      padding: '48px 24px',
      background: 'linear-gradient(180deg, #0B1222 0%, #060A14 100%)',
      borderRadius: 16,
      border: '1px solid #1E293B',
      textAlign: 'center',
      maxWidth: 680,
      margin: '24px auto',
      boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5)',
    }}>
      <div style={{
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: 'rgba(16, 185, 129, 0.12)',
        border: '1px solid rgba(16, 185, 129, 0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 16px',
        boxShadow: '0 0 24px rgba(16, 185, 129, 0.2)',
      }}>
        <ShieldCheck size={30} color="#10B981" />
      </div>

      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F8FAFC', marginBottom: 6, letterSpacing: '-0.01em' }}>
        {title}
      </h3>

      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 10px',
        borderRadius: 20,
        background: 'rgba(16, 185, 129, 0.12)',
        color: '#34D399',
        fontSize: '0.74rem',
        fontWeight: 700,
        marginBottom: 12,
      }}>
        <span>●</span>
        <span>Razorpay: {razorpayStatus.key_id_masked || "Connected · Test Mode"}</span>
      </div>

      <p style={{ fontSize: '0.85rem', color: '#94A3B8', maxWidth: 480, margin: '0 auto 24px', lineHeight: 1.5 }}>
        {subtitle}
      </p>

      {successNotice && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: 8,
          padding: '10px 16px',
          color: '#34D399',
          fontSize: '0.8rem',
          fontWeight: 600,
          maxWidth: 480,
          margin: '0 auto 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          justifyContent: 'center',
        }}>
          <CheckCircle2 size={16} />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            background: 'rgba(30, 41, 59, 0.8)',
            border: '1px solid #334155',
            borderRadius: 8,
            padding: '10px 18px',
            color: '#F1F5F9',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          <span>{refreshing ? "Syncing..." : "Sync Again"}</span>
        </button>

        <button
          type="button"
          onClick={handleCreateTest}
          disabled={creatingTest}
          style={{
            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
            border: 'none',
            borderRadius: 8,
            padding: '10px 18px',
            color: '#FFFFFF',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
          }}
        >
          <Sparkles size={15} />
          <span>{creatingTest ? "Creating Candidate..." : "Create Test Scenario"}</span>
        </button>

        {onOpenLiveModal && (
          <button
            type="button"
            onClick={onOpenLiveModal}
            style={{
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              border: 'none',
              borderRadius: 8,
              padding: '10px 18px',
              color: '#FFFFFF',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
            }}
          >
            <Zap size={15} />
            <span>Generate Test Payment Link</span>
          </button>
        )}
      </div>
    </div>
  );
}
