import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Lock,
  Sparkles,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';

export default function RealWorkspaceGateway() {
  const {
    workspace,
    onboardingState,
    saveProfile,
    connectRazorpay,
    setMode,
  } = useWorkspace();

  // Multi-step form state: 1 = Business Setup, 2 = Razorpay Credentials, 3 = Verifying/Syncing
  const [step, setStep] = useState<number>(() => {
    if (onboardingState === 'RAZORPAY_NOT_CONNECTED') return 2;
    if (onboardingState === 'RAZORPAY_CONNECTING' || onboardingState === 'INITIAL_SYNC') return 3;
    return 1;
  });

  // Business Context Fields
  const [businessName, setBusinessName] = useState(workspace?.name || '');
  const [businessType, setBusinessType] = useState(workspace?.business_type || 'ecommerce');
  const [industry, setIndustry] = useState(workspace?.industry || 'FinTech / E-Commerce');
  const currency = workspace?.currency || 'INR';
  const country = workspace?.country || 'IN';
  const [monthlyGmv, setMonthlyGmv] = useState<number>(workspace?.monthly_gmv_inr || 2500000);
  const [aov, setAov] = useState<number>(workspace?.average_order_value_inr || 2499);
  const [recoveryGoals, setRecoveryGoals] = useState<string[]>(() => {
    return workspace?.primary_recovery_goals
      ? workspace.primary_recovery_goals.split(',').map(s => s.trim())
      : ['Subscription Recovery', 'Checkout Recovery'];
  });

  // Razorpay Credentials Fields
  const [selectedEnv, setSelectedEnv] = useState<'test' | 'live'>('test');
  const [keyId, setKeyId] = useState('');
  const [keySecret, setKeySecret] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');

  // UI status
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const toggleGoal = (goal: string) => {
    setRecoveryGoals(prev =>
      prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]
    );
  };

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      setErrorMessage('Please enter your business name.');
      return;
    }
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await saveProfile({
        business_name: businessName.trim(),
        business_type: businessType,
        industry,
        currency,
        country,
        monthly_gmv_inr: Number(monthlyGmv),
        average_order_value_inr: Number(aov),
        primary_recovery_goals: recoveryGoals.join(', '),
      });
      setStep(2);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.detail || err.message || 'Failed to save business profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConnectRazorpay = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = keyId.trim();
    const cleanSecret = keySecret.trim();
    if (!cleanKey || !cleanSecret) {
      setErrorMessage('Please provide both Razorpay Key ID and Key Secret.');
      return;
    }
    if (selectedEnv === 'test' && !cleanKey.startsWith('rzp_test_')) {
      setErrorMessage('Test mode Key ID must begin with rzp_test_. Select "Live / Production" if you are entering production keys.');
      return;
    }
    if (selectedEnv === 'live' && !cleanKey.startsWith('rzp_live_')) {
      setErrorMessage('Live mode Key ID must begin with rzp_live_. Select "Test / Sandbox" if you are entering sandbox keys.');
      return;
    }
    setErrorMessage(null);
    setSubmitting(true);
    setStep(3); // Show verification loader
    try {
      const res = await connectRazorpay({
        key_id: cleanKey,
        key_secret: cleanSecret,
        webhook_secret: webhookSecret.trim(),
        environment: selectedEnv,
      });
      if (!res?.success) {
        setErrorMessage(res?.error || res?.error_detail || 'Verification failed on Razorpay API.');
        setStep(2);
      }
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.detail || err.message || 'Verification failed on Razorpay API.');
      setStep(2);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 0%, #0F172A 0%, #020617 100%)',
      color: '#F8FAFC',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* Top Banner Navigation */}
      <div style={{
        maxWidth: 720,
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(59, 130, 246, 0.4)',
          }}>
            <Sparkles size={18} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#F1F5F9' }}>
              Revive<span style={{ color: '#38BDF8' }}>OS</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>
              ENTERPRISE REVENUE RECOVERY PLATFORM
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMode('demo')}
          style={{
            background: 'rgba(30, 41, 59, 0.6)',
            border: '1px solid rgba(71, 85, 105, 0.4)',
            borderRadius: 8,
            padding: '6px 14px',
            color: '#94A3B8',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>Explore Demo Universe</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Main Glass Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          maxWidth: 720,
          width: '100%',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid #1E293B',
          borderRadius: 16,
          padding: '32px 36px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        }}
      >
        {/* Progress Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: step >= 1 ? '#38BDF8' : '#64748B',
            fontSize: '0.8rem',
            fontWeight: 700,
          }}>
            <div style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: step >= 1 ? 'rgba(56, 189, 248, 0.2)' : 'rgba(100, 116, 139, 0.2)',
              border: `1px solid ${step >= 1 ? '#38BDF8' : '#475569'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
            }}>
              1
            </div>
            <span>Business Setup</span>
          </div>

          <div style={{ width: 40, height: 1, background: step >= 2 ? '#38BDF8' : '#334155' }} />

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: step >= 2 ? '#38BDF8' : '#64748B',
            fontSize: '0.8rem',
            fontWeight: 700,
          }}>
            <div style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: step >= 2 ? 'rgba(56, 189, 248, 0.2)' : 'rgba(100, 116, 139, 0.2)',
              border: `1px solid ${step >= 2 ? '#38BDF8' : '#475569'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
            }}>
              2
            </div>
            <span>Connect Razorpay</span>
          </div>

          <div style={{ width: 40, height: 1, background: step >= 3 ? '#38BDF8' : '#334155' }} />

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: step >= 3 ? '#38BDF8' : '#64748B',
            fontSize: '0.8rem',
            fontWeight: 700,
          }}>
            <div style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: step >= 3 ? 'rgba(56, 189, 248, 0.2)' : 'rgba(100, 116, 139, 0.2)',
              border: `1px solid ${step >= 3 ? '#38BDF8' : '#475569'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
            }}>
              3
            </div>
            <span>Verify & Ingest</span>
          </div>
        </div>

        {errorMessage && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: '#FCA5A5',
            fontSize: '0.82rem',
          }}>
            <AlertTriangle size={18} color="#EF4444" style={{ flexShrink: 0 }} />
            <div>{errorMessage}</div>
          </div>
        )}

        {/* STEP 1: BUSINESS SETUP */}
        {step === 1 && (
          <form onSubmit={handleSaveBusiness}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#F8FAFC', marginBottom: 6 }}>
                Welcome to Your Real ReviveOS Workspace
              </h2>
              <p style={{ fontSize: '0.84rem', color: '#94A3B8', maxWidth: 480, margin: '0 auto', lineHeight: 1.5 }}>
                Before ReviveOS can analyze your payment ecosystem, configure your business context to calibrate risk scores and recovery thresholds.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#CBD5E1', marginBottom: 6 }}>
                  Business Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Technologies India Pvt Ltd"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: '#0B1222',
                    border: '1px solid #334155',
                    color: '#F8FAFC',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#CBD5E1', marginBottom: 6 }}>
                    Business Model
                  </label>
                  <select
                    value={businessType}
                    onChange={e => setBusinessType(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: '#0B1222',
                      border: '1px solid #334155',
                      color: '#F8FAFC',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  >
                    <option value="ecommerce">E-Commerce & D2C</option>
                    <option value="saas">SaaS & Cloud Software</option>
                    <option value="subscription">Recurring & Memberships</option>
                    <option value="b2b">B2B & Enterprise Services</option>
                    <option value="marketplace">Marketplace</option>
                    <option value="services">Professional Services</option>
                    <option value="other">Other Hybrid</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#CBD5E1', marginBottom: 6 }}>
                    Industry Segment
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. FinTech, EdTech, D2C Apparel"
                    value={industry}
                    onChange={e => setIndustry(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: '#0B1222',
                      border: '1px solid #334155',
                      color: '#F8FAFC',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#CBD5E1', marginBottom: 6 }}>
                    Monthly Processing Volume (GMV INR)
                  </label>
                  <input
                    type="number"
                    placeholder="2500000"
                    value={monthlyGmv}
                    onChange={e => setMonthlyGmv(Number(e.target.value))}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: '#0B1222',
                      border: '1px solid #334155',
                      color: '#F8FAFC',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#CBD5E1', marginBottom: 6 }}>
                    Average Order Value (AOV INR)
                  </label>
                  <input
                    type="number"
                    placeholder="2499"
                    value={aov}
                    onChange={e => setAov(Number(e.target.value))}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: '#0B1222',
                      border: '1px solid #334155',
                      color: '#F8FAFC',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#CBD5E1', marginBottom: 6 }}>
                  Primary Recovery Priorities
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    'Subscription Recovery',
                    'Checkout Recovery',
                    'Invoice Recovery',
                    'Customer Retention & Churn',
                  ].map(goal => {
                    const isSelected = recoveryGoals.includes(goal);
                    return (
                      <button
                        key={goal}
                        type="button"
                        onClick={() => toggleGoal(goal)}
                        style={{
                          textAlign: 'left',
                          padding: '10px 12px',
                          borderRadius: 8,
                          background: isSelected ? 'rgba(56, 189, 248, 0.15)' : '#0B1222',
                          border: `1px solid ${isSelected ? '#38BDF8' : '#1E293B'}`,
                          color: isSelected ? '#38BDF8' : '#94A3B8',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>{goal}</span>
                        {isSelected && <CheckCircle2 size={15} color="#38BDF8" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 8,
                    padding: '12px 24px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                  }}
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <span>Continue to Razorpay Setup</span>}
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </form>
        )}

        {/* STEP 2: CONNECT RAZORPAY ACCOUNT */}
        {step === 2 && (
          <form onSubmit={handleConnectRazorpay}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#F8FAFC', marginBottom: 6 }}>
                Connect your Razorpay account
              </h2>
              <p style={{ fontSize: '0.84rem', color: '#94A3B8', maxWidth: 520, margin: '0 auto', lineHeight: 1.5 }}>
                Link your Razorpay merchant account to ingest transactions, calibrate risk intelligence, and execute revenue recovery workflows.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Interactive Environment Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#CBD5E1', marginBottom: 8 }}>
                  Connection Environment *
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                }}>
                  {/* Test / Sandbox Option */}
                  <div
                    onClick={() => {
                      setSelectedEnv('test');
                      setErrorMessage(null);
                    }}
                    style={{
                      border: `1.5px solid ${selectedEnv === 'test' ? '#38BDF8' : '#1E293B'}`,
                      background: selectedEnv === 'test' ? 'rgba(56, 189, 248, 0.08)' : '#0B1222',
                      borderRadius: 10,
                      padding: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 800, color: selectedEnv === 'test' ? '#38BDF8' : '#F1F5F9' }}>
                        Test / Sandbox
                      </span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 5,
                        background: selectedEnv === 'test' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                        color: selectedEnv === 'test' ? '#38BDF8' : '#94A3B8',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                      }}>
                        rzp_test_...
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#94A3B8', lineHeight: 1.4 }}>
                      Safe sandbox rails on <code>api.razorpay.com</code>. No real money moved. Used for end-to-end integration testing and risk simulation.
                    </p>
                  </div>

                  {/* Live / Production Option */}
                  <div
                    onClick={() => {
                      setSelectedEnv('live');
                      setErrorMessage(null);
                    }}
                    style={{
                      border: `1.5px solid ${selectedEnv === 'live' ? '#10B981' : '#1E293B'}`,
                      background: selectedEnv === 'live' ? 'rgba(16, 185, 129, 0.08)' : '#0B1222',
                      borderRadius: 10,
                      padding: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 800, color: selectedEnv === 'live' ? '#10B981' : '#F1F5F9' }}>
                        Live / Production
                      </span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 5,
                        background: selectedEnv === 'live' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                        color: selectedEnv === 'live' ? '#34D399' : '#94A3B8',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                      }}>
                        rzp_live_...
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#94A3B8', lineHeight: 1.4 }}>
                      Production merchant telemetry on <code>api.razorpay.com</code>. Live money actions guarded by policy firewall and human confirmation.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#CBD5E1', marginBottom: 6 }}>
                  Razorpay Key ID ({selectedEnv === 'test' ? 'Test Mode' : 'Live Mode'}) *
                </label>
                <input
                  type="text"
                  required
                  placeholder={selectedEnv === 'test' ? 'rzp_test_...' : 'rzp_live_...'}
                  value={keyId}
                  onChange={e => setKeyId(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: '#0B1222',
                    border: '1px solid #334155',
                    color: '#F8FAFC',
                    fontSize: '0.85rem',
                    fontFamily: 'monospace',
                    outline: 'none',
                  }}
                />
                <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: 4 }}>
                  {selectedEnv === 'test'
                    ? 'Obtain from Razorpay Dashboard → Settings → API Keys → Generate Test Key.'
                    : 'Obtain from Razorpay Dashboard → Settings → API Keys → Generate Live Key.'}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#CBD5E1', marginBottom: 6 }}>
                  Razorpay Key Secret *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••••••"
                    value={keySecret}
                    onChange={e => setKeySecret(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: '#0B1222',
                      border: '1px solid #334155',
                      color: '#F8FAFC',
                      fontSize: '0.85rem',
                      fontFamily: 'monospace',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#CBD5E1', marginBottom: 6 }}>
                  Razorpay Webhook Secret (Optional)
                </label>
                <input
                  type="password"
                  placeholder="Optional webhook signing secret"
                  value={webhookSecret}
                  onChange={e => setWebhookSecret(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: '#0B1222',
                    border: '1px solid #334155',
                    color: '#F8FAFC',
                    fontSize: '0.85rem',
                    fontFamily: 'monospace',
                    outline: 'none',
                  }}
                />
              </div>

              {selectedEnv === 'live' && (
                <div style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  color: '#FCD34D',
                  fontSize: '0.73rem',
                }}>
                  <AlertTriangle size={16} color="#F59E0B" style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Production Rails Guarded:</strong> ReviveOS ingests telemetry in read-only mode by default. Real-money actions (such as generating recovery payment links or retrying mandates) will require human operator confirmation.
                  </div>
                </div>
              )}

              {/* Security Guarantee Alert */}
              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: 8,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                color: '#6EE7B7',
                fontSize: '0.73rem',
              }}>
                <Lock size={16} color="#10B981" style={{ flexShrink: 0 }} />
                <div>
                  <strong>Enterprise Security Guarantee:</strong> Credentials are encrypted at rest with Fernet 256-bit symmetric encryption and verified directly with Razorpay. Secrets are never exposed to browser bundles, localStorage, or API responses.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{
                    background: 'transparent',
                    color: '#94A3B8',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    padding: '10px 18px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <ArrowLeft size={16} />
                  <span>Back to Business Setup</span>
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: selectedEnv === 'live'
                      ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                      : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 8,
                    padding: '12px 24px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: selectedEnv === 'live'
                      ? '0 4px 14px rgba(16, 185, 129, 0.35)'
                      : '0 4px 14px rgba(37, 99, 235, 0.35)',
                  }}
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  <span>Connect & Verify {selectedEnv === 'live' ? 'Live' : 'Test'} Credentials</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* STEP 3: VERIFYING & INGESTING DATA */}
        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Loader2 size={42} color="#38BDF8" className="animate-spin" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#F8FAFC', marginBottom: 8 }}>
              Verifying & Ingesting Workspace Data
            </h3>
            <p style={{ fontSize: '0.84rem', color: '#94A3B8', maxWidth: 440, margin: '0 auto 24px', lineHeight: 1.5 }}>
              Connecting directly to <code>api.razorpay.com</code> ({selectedEnv.toUpperCase()} mode), verifying permissions, and preparing your private recovery workspace.
            </p>

            <div style={{
              maxWidth: 420,
              margin: '0 auto',
              background: '#0B1222',
              borderRadius: 8,
              border: '1px solid #1E293B',
              padding: '14px 16px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              fontSize: '0.78rem',
              color: '#CBD5E1',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={14} color="#10B981" />
                <span>Authenticating {selectedEnv === 'live' ? 'Live' : 'Test'} API Key & Secret with Razorpay</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={14} color="#10B981" />
                <span>Persisting encrypted credentials to tenant store</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Loader2 size={14} color="#38BDF8" className="animate-spin" />
                <span>Synchronizing {selectedEnv === 'live' ? 'production' : 'test'} payment telemetry...</span>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
