import React, { useState, useEffect } from 'react';
import { 
  Shield, History, Sliders, CheckCircle2, 
  Plus, RefreshCw, Zap
} from 'lucide-react';
import { getPolicies, getActivePolicy, createPolicyVersion, simulatePolicy, getRazorpayStatus } from '../api/client';

export const PolicyStudio: React.FC = () => {
  const [policies, setPolicies] = useState<any[]>([]);
  const [activePolicy, setActivePolicy] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [providerStatus, setProviderStatus] = useState<any>(null);

  // Simulation form
  const [simCeiling, setSimCeiling] = useState<number>(50000);
  const [simRetries, setSimRetries] = useState<number>(3);
  const [simRisk, setSimRisk] = useState<number>(0.70);
  const [simGateways, setSimGateways] = useState<string[]>(['razorpay', 'payu', 'cashfree', 'stripe']);

  // Simulation output
  const [simResult, setSimResult] = useState<any>(null);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const presets = [
    { label: 'Strict Conservative', ceiling: 25000, retries: 2, risk: 0.50, desc: 'Prioritizes human review and zero chargeback friction' },
    { label: 'Standard Balanced', ceiling: 50000, retries: 3, risk: 0.70, desc: 'Recommended default for SaaS and D2C' },
    { label: 'Growth Aggressive', ceiling: 150000, retries: 4, risk: 0.85, desc: 'Maximum autonomous recovery throughput' },
  ];

  const loadPolicies = async () => {
    try {
      const [all, active, pStatus] = await Promise.all([
        getPolicies(),
        getActivePolicy(),
        getRazorpayStatus().catch(() => null)
      ]);
      setPolicies(all);
      setActivePolicy(active);
      setProviderStatus(pStatus);
      if (active?.rules) {
        setSimCeiling(active.rules.max_automated_amount_inr || 50000);
        setSimRetries(active.rules.max_retries_per_case || 3);
        setSimRisk(active.rules.high_risk_threshold || 0.70);
        setSimGateways(active.rules.allowed_gateways || ['razorpay', 'payu', 'cashfree', 'stripe']);
      }
    } catch (e) {
      console.error('Failed to load policies:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      const result = await simulatePolicy({
        max_automated_amount_inr: simCeiling,
        max_retries_per_case: simRetries,
        high_risk_threshold: simRisk,
        allowed_gateways: simGateways,
      });
      setSimResult(result);
    } catch (e) {
      console.error('Policy simulation error:', e);
    } finally {
      setSimulating(false);
    }
  };

  const handleApplyNewVersion = async () => {
    try {
      await createPolicyVersion({
        name: `Merchant Policy v${(policies.length || 1) + 1}`,
        description: `Custom governance rules with ₹${simCeiling.toLocaleString('en-IN')} automation ceiling.`,
        max_automated_amount_inr: simCeiling,
        max_retries_per_case: simRetries,
        high_risk_threshold: simRisk,
        allowed_gateways: simGateways,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
      await loadPolicies();
    } catch (e) {
      console.error('Failed to create policy version:', e);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  useEffect(() => {
    if (!loading) {
      handleSimulate();
    }
  }, [simCeiling, simRetries, simRisk, simGateways, loading]);

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* ── Top Hero Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(99, 102, 241, 0.08) 50%, rgba(59, 130, 246, 0.08) 100%)',
        border: '1px solid rgba(139, 92, 246, 0.25)',
        borderRadius: '24px',
        padding: '24px 28px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)'
            }}>
              <Shield size={24} color="#FFF" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFF', letterSpacing: '-0.02em' }}>
                  Recovery Policy Studio
                </h1>
                <span style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.2)', color: '#C4B5FD', border: '1px solid rgba(139, 92, 246, 0.3)', fontWeight: 600 }}>
                  {activePolicy ? `v${activePolicy.version}.0 ACTIVE IN PRODUCTION` : 'v1.0 ACTIVE'}
                </span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#94A3B8', marginTop: '4px' }}>
                Merchant governance control tower: define hard automation ceilings, simulate policy changes, and manage immutable version history.
              </p>
            </div>
          </div>

          <button
            onClick={handleApplyNewVersion}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
              color: '#FFF',
              borderRadius: '12px',
              fontSize: '0.8125rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(139, 92, 246, 0.3)'
            }}
          >
            <Plus size={15} />
            <span>Deploy Policy v{(policies.length || 1) + 1}.0</span>
          </button>
        </div>

        {/* Quick Presets */}
        <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.6875rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Governance Presets:
          </span>
          {presets.map((pr, i) => (
            <button
              key={i}
              onClick={() => {
                setSimCeiling(pr.ceiling);
                setSimRetries(pr.retries);
                setSimRisk(pr.risk);
              }}
              style={{
                background: simCeiling === pr.ceiling ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                border: simCeiling === pr.ceiling ? '1px solid rgba(139, 92, 246, 0.6)' : '1px solid rgba(255, 255, 255, 0.08)',
                color: simCeiling === pr.ceiling ? '#C4B5FD' : '#94A3B8',
                borderRadius: '20px',
                padding: '4px 12px',
                fontSize: '0.6875rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {pr.label} (₹{(pr.ceiling / 1000).toFixed(0)}k)
            </button>
          ))}
        </div>
      </div>

      {savedSuccess && (
        <div style={{
          padding: '14px 20px',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          borderRadius: '12px',
          color: '#34D399',
          fontSize: '0.8125rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: 600
        }}>
          <CheckCircle2 size={16} />
          <span>New policy version deployed successfully! All recovery agents are now enforcing the updated ceiling.</span>
        </div>
      )}

      {/* ── Main Two-Column Layout (Responsive) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Left: Policy Rule Editor */}
        <div style={{
          background: '#0F172A',
          border: '1px solid #1E293B',
          borderRadius: '24px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '22px',
          height: 'fit-content'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1E293B', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={16} color="#8B5CF6" />
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#F1F5F9' }}>
                Configurable Safety Rules
              </span>
            </div>
            <span style={{ fontSize: '0.625rem', color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '8px', fontWeight: 700 }}>
              SERVER ENFORCED
            </span>
          </div>

          {/* Amount Ceiling Slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
              <span style={{ color: '#94A3B8', fontWeight: 500 }}>Max Automated Amount Ceiling</span>
              <span style={{ color: '#C4B5FD', fontWeight: 800, fontFamily: 'monospace' }}>
                ₹{simCeiling.toLocaleString('en-IN')}
              </span>
            </div>
            <input
              type="range"
              min="10000"
              max="200000"
              step="5000"
              value={simCeiling}
              onChange={(e) => setSimCeiling(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#8B5CF6', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.625rem', color: '#475569' }}>
              <span>₹10K</span>
              <span>₹1.0L</span>
              <span>₹2.0L</span>
            </div>
            <p style={{ fontSize: '0.6875rem', color: '#64748B', lineHeight: 1.4 }}>
              Transactions above this threshold are routed to human operations queue before payment capture.
            </p>
          </div>

          {/* Max Retries */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
              <span style={{ color: '#94A3B8', fontWeight: 500 }}>Max Retry Limit Per Case</span>
              <span style={{ color: '#F59E0B', fontWeight: 800, fontFamily: 'monospace' }}>
                {simRetries} Attempts
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={simRetries}
              onChange={(e) => setSimRetries(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#F59E0B', cursor: 'pointer' }}
            />
            <p style={{ fontSize: '0.6875rem', color: '#64748B' }}>
              Protects merchant card velocity limits and avoids network penalty fines.
            </p>
          </div>

          {/* High Risk Threshold */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
              <span style={{ color: '#94A3B8', fontWeight: 500 }}>Risk Score Escalation Trigger</span>
              <span style={{ color: '#EF4444', fontWeight: 800, fontFamily: 'monospace' }}>
                {(simRisk * 100).toFixed(0)}% Risk
              </span>
            </div>
            <input
              type="range"
              min="0.4"
              max="0.9"
              step="0.05"
              value={simRisk}
              onChange={(e) => setSimRisk(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#EF4444', cursor: 'pointer' }}
            />
          </div>

          {/* Approved Gateways */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 500 }}>Approved Routing Gateways</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {['razorpay', 'payu', 'cashfree', 'stripe'].map((gw) => {
                const checked = simGateways.includes(gw);
                return (
                  <button 
                    key={gw}
                    type="button"
                    onClick={() => {
                      if (checked) setSimGateways(simGateways.filter(g => g !== gw));
                      else setSimGateways([...simGateways, gw]);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: checked ? 'rgba(139, 92, 246, 0.15)' : '#1E293B',
                      border: checked ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid #334155',
                      color: checked ? '#FFF' : '#64748B',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textTransform: 'capitalize'
                    }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: checked ? '#8B5CF6' : '#475569' }} />
                    <span>{gw}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: What-If Simulation Sandbox & Version History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Simulation Output Card */}
          <div style={{
            background: '#0F172A',
            border: '1px solid #1E293B',
            borderRadius: '24px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1E293B', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60A5FA' }}>
                  <RefreshCw size={16} className={simulating ? 'animate-spin' : ''} />
                </div>
                <div>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#F1F5F9' }}>
                    Live "What-If" Policy Impact Simulator
                  </h3>
                  <p style={{ fontSize: '0.6875rem', color: '#64748B' }}>
                    {providerStatus?.active_environment === "RAZORPAY_TEST" || providerStatus?.active_environment === "RAZORPAY_LIVE"
                      ? `Simulating rule changes against active ${providerStatus?.active_environment || "RAZORPAY TEST"} sandbox portfolio`
                      : "Simulating rule changes against current portfolio of 7 demo revenue cases"}
                  </p>
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#34D399', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: '8px', fontWeight: 700 }}>
                Coverage: {simResult?.impact_summary?.automation_coverage_percentage ?? (providerStatus?.active_environment === "RAZORPAY_TEST" ? 0 : 71.4)}%
              </span>
            </div>

            {/* 3 Impact Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', margin: '20px 0' }}>
              <div style={{ padding: '16px', borderRadius: '12px', background: '#1E293B', border: '1px solid #334155' }}>
                <div style={{ fontSize: '0.625rem', textTransform: 'uppercase', fontWeight: 700, color: '#F59E0B' }}>Newly Blocked Cases</div>
                <div style={{ fontSize: '1.375rem', fontWeight: 800, color: '#F59E0B', fontFamily: 'monospace', marginTop: '4px' }}>
                  {simResult?.impact_summary?.newly_blocked_count || 0} Cases
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#94A3B8', marginTop: '2px' }}>
                  ₹{(simResult?.impact_summary?.newly_blocked_revenue_inr || 0).toLocaleString('en-IN')}
                </div>
              </div>

              <div style={{ padding: '16px', borderRadius: '12px', background: '#1E293B', border: '1px solid #334155' }}>
                <div style={{ fontSize: '0.625rem', textTransform: 'uppercase', fontWeight: 700, color: '#10B981' }}>Shifted to Human Ops</div>
                <div style={{ fontSize: '1.375rem', fontWeight: 800, color: '#10B981', fontFamily: 'monospace', marginTop: '4px' }}>
                  ₹{(simResult?.impact_summary?.risk_exposure_reduction_inr || 0).toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#94A3B8', marginTop: '2px' }}>Zero Uncontrolled Risk</div>
              </div>

              <div style={{ padding: '16px', borderRadius: '12px', background: '#1E293B', border: '1px solid #334155' }}>
                <div style={{ fontSize: '0.625rem', textTransform: 'uppercase', fontWeight: 700, color: '#60A5FA' }}>Portfolio Exposure</div>
                <div style={{ fontSize: '1.375rem', fontWeight: 800, color: '#FFF', fontFamily: 'monospace', marginTop: '4px' }}>
                  ₹{((simResult?.impact_summary?.total_exposure_inr !== undefined) ? simResult.impact_summary.total_exposure_inr : ((providerStatus?.active_environment === "RAZORPAY_TEST" || providerStatus?.active_environment === "RAZORPAY_LIVE") ? 0 : 1144898)).toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#94A3B8', marginTop: '2px' }}>
                  Across {((simResult?.impact_summary?.total_cases_evaluated !== undefined) ? simResult.impact_summary.total_cases_evaluated : ((providerStatus?.active_environment === "RAZORPAY_TEST" || providerStatus?.active_environment === "RAZORPAY_LIVE") ? 0 : 7))} active cases
                </div>
              </div>
            </div>

            {/* Recommendation banner */}
            <div style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              fontSize: '0.75rem',
              color: '#93C5FD',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Zap size={15} color="#60A5FA" />
              <span><strong>Recommendation: </strong>{simResult?.recommendation || 'Policy maintains balanced autonomous recovery with appropriate human escalation.'}</span>
            </div>
          </div>

          {/* Policy Version History Ledger */}
          <div style={{
            background: '#0F172A',
            border: '1px solid #1E293B',
            borderRadius: '24px',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #1E293B', paddingBottom: '12px' }}>
              <History size={16} color="#8B5CF6" />
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#F1F5F9' }}>
                Immutable Policy Version Registry
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
              {policies.map((p) => {
                const isActive = p.status === 'ACTIVE';
                return (
                  <div 
                    key={p.policy_id}
                    style={{
                      padding: '14px 18px',
                      borderRadius: '12px',
                      border: isActive ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid #1E293B',
                      background: isActive ? 'rgba(139, 92, 246, 0.1)' : '#1E293B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#FFF', fontFamily: 'monospace' }}>v{p.version}.0</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#E2E8F0' }}>{p.name}</span>
                        {isActive && (
                          <span style={{ fontSize: '0.625rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.2)', color: '#10B981', fontWeight: 700 }}>
                            LIVE ACTIVE
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: '#64748B', marginTop: '4px' }}>
                        Ceiling: ₹{p.rules.max_automated_amount_inr?.toLocaleString('en-IN')} • Max Retries: {p.rules.max_retries_per_case} • Author: {p.created_by}
                      </div>
                    </div>

                    <div style={{ fontSize: '0.6875rem', color: '#64748B', fontFamily: 'monospace' }}>
                      {new Date(p.created_at).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};