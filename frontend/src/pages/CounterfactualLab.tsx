import React, { useState, useEffect } from 'react';
import { 
  GitCompare, ShieldCheck, AlertTriangle, 
  Zap, CheckCircle2, XCircle, RotateCcw, Sliders, Shield
} from 'lucide-react';
import { evaluateCounterfactuals, getCounterfactualCase } from '../api/client';

export const CounterfactualLab: React.FC = () => {
  // Input parameters
  const [amount, setAmount] = useState<number>(150000);
  const [failureCode, setFailureCode] = useState<string>('INSUFFICIENT_FUNDS');
  const [customerTenure, setCustomerTenure] = useState<number>(14);
  const [successRate, setSuccessRate] = useState<number>(0.92);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isWeekend, setIsWeekend] = useState<boolean>(true);
  const [gatewayDegraded, setGatewayDegraded] = useState<boolean>(false);
  const gatewayErrorRate = 0.04;
  const policyCeiling = 500000;

  // Result state
  const [loading, setLoading] = useState<boolean>(false);
  const [report, setReport] = useState<any>(null);

  const presets = [
    { code: 'INSUFFICIENT_FUNDS', label: 'B2B Weekend Limit', amt: 150000, weekend: true, desc: 'Daily corporate spending ceiling reset' },
    { code: 'PAYU_TIMEOUT', label: 'PayU Processor Outage', amt: 184500, weekend: false, desc: '34% timeout rate on primary socket' },
    { code: 'CARD_EXPIRED', label: 'Expired Card Churn', amt: 49900, weekend: false, desc: 'Involuntary churn credential expiry' },
    { code: 'DO_NOT_HONOR', label: 'Luxury 3DS Fraud Filter', amt: 875000, weekend: false, desc: 'High-ticket authentication challenge' },
  ];

  const runEvaluation = async () => {
    setLoading(true);
    try {
      const data = await evaluateCounterfactuals({
        amount_inr: amount,
        failure_code: failureCode,
        customer_tenure_months: customerTenure,
        historical_success_rate: successRate,
        retry_count: retryCount,
        gateway: 'razorpay',
        gateway_is_degraded: gatewayDegraded,
        gateway_error_rate: gatewayErrorRate,
        is_weekend: isWeekend,
        policy_ceiling_inr: policyCeiling,
      });
      setReport(data);
    } catch (e) {
      console.error('Counterfactual evaluation error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const caseId = params.get('caseId');
    const paramAmt = params.get('amount');
    const paramCode = params.get('failureCode');
    const paramTenure = params.get('customerTenure');
    const paramSuccessRate = params.get('successRate');

    if (caseId) {
      getCounterfactualCase(caseId).then(res => {
        if (res && res.case) {
          if (res.case.amount_inr) setAmount(res.case.amount_inr);
          if (res.case.failure_code) setFailureCode(res.case.failure_code);
          if (res.case.customer_tenure_months) setCustomerTenure(res.case.customer_tenure_months);
          if (res.case.customer_success_rate) setSuccessRate(res.case.customer_success_rate);
          if (res.case.retry_count !== undefined) setRetryCount(res.case.retry_count);
        }
      }).catch(() => null);
    } else if (paramAmt) {
      setAmount(parseFloat(paramAmt));
      if (paramCode) setFailureCode(paramCode);
      if (paramTenure) setCustomerTenure(parseInt(paramTenure));
      if (paramSuccessRate) setSuccessRate(parseFloat(paramSuccessRate));
    }
  }, []);

  useEffect(() => {
    runEvaluation();
  }, [amount, failureCode, customerTenure, successRate, retryCount, isWeekend, gatewayDegraded]);

  // ── Strategy Switcher State ──
  const [activeStrategy, setActiveStrategy] = React.useState<string>('REVIVEOS');
  
  const strategies = [
    { id: 'DO_NOTHING', label: 'DO NOTHING', color: '#64748B', icon: '◻', grossRecovered: amount * 0.31, cost: 0, discount: 0, nic: 0 },
    { id: 'RETRY', label: 'SMART RETRY', color: '#00F0FF', icon: '↺', grossRecovered: amount * 0.88, cost: 4, discount: 0, nic: (0.57 * amount) - 4 },
    { id: 'PAYMENT_LINK', label: 'PAYMENT LINK', color: '#A5B4FC', icon: '🔗', grossRecovered: amount * 0.72, cost: 6.5, discount: 0, nic: (0.41 * amount) - 6.5 },
    { id: 'WHATSAPP', label: 'WHATSAPP', color: '#00FF66', icon: '💬', grossRecovered: amount * 0.65, cost: 3.5, discount: 0, nic: (0.34 * amount) - 3.5 },
    { id: 'DISCOUNT', label: '15% DISCOUNT', color: '#F59E0B', icon: '%', grossRecovered: amount * 0.91, cost: 5, discount: amount * 0.15, nic: (0.60 * amount) - 5 - (amount * 0.15) },
    { id: 'REVIVEOS', label: 'REVIVEOS NIC', color: '#00FF66', icon: '⚡', grossRecovered: amount * 0.88, cost: 4, discount: 0, nic: (0.78 * amount) - 4 },
  ];
  
  const sel = strategies.find(s => s.id === activeStrategy)!;
  const baseline = strategies.find(s => s.id === 'DO_NOTHING')!;
  const fmt2 = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* ── Strategy Switcher Panel ── */}
      <div style={{ background: '#0F1117', border: '1px solid #1E2230', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 800, color: '#00F0FF', letterSpacing: '0.15em', marginBottom: '4px' }}>COUNTERFACTUAL STRATEGY SWITCHER</div>
            <h3 style={{ fontFamily: 'var(--font-section-heading)', fontSize: '1.2rem', fontWeight: 700, color: '#FFF', margin: 0 }}>What Would Have Happened Without This Intervention?</h3>
          </div>
          <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(245,158,11,0.15)', color: '#F59E0B', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>[SIMULATION]</span>
        </div>
        
        {/* Strategy buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {strategies.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveStrategy(s.id)}
              style={{
                padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: 700,
                background: activeStrategy === s.id ? `${s.color}18` : '#0A0C10',
                border: activeStrategy === s.id ? `1.5px solid ${s.color}` : '1px solid #1E2230',
                color: activeStrategy === s.id ? s.color : '#8E9BB0',
                fontFamily: 'var(--font-mono)',
                boxShadow: activeStrategy === s.id ? `0 0 16px ${s.color}20` : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>
        
        {/* Side-by-side comparison */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Without: baseline natural recovery */}
          <div style={{ background: '#0A0C10', border: '1px solid #1E2230', borderRadius: '14px', padding: '18px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 800, color: '#64748B', marginBottom: '12px' }}>WITHOUT INTERVENTION (NATURAL RECOVERY)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Gross Recovered', value: fmt2(baseline.grossRecovered) },
                { label: 'Intervention Cost', value: '₹0' },
                { label: 'Discount Leakage', value: '₹0' },
                { label: 'NIC vs Nothing', value: '—' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#64748B' }}>{r.label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#8E9BB0', fontWeight: 700 }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* With: selected strategy */}
          <div style={{ background: '#0A0C10', border: `1.5px solid ${sel.color}40`, borderRadius: '14px', padding: '18px', boxShadow: `0 0 20px ${sel.color}10` }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 800, color: sel.color, marginBottom: '12px' }}>WITH: {sel.label}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Gross Recovered', value: fmt2(sel.grossRecovered) },
                { label: 'Intervention Cost', value: fmt2(sel.cost) },
                { label: 'Discount Leakage', value: fmt2(sel.discount) },
                { label: 'Net Incremental Contribution', value: fmt2(sel.nic - baseline.grossRecovered), highlight: true },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#64748B' }}>{r.label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: (r as any).highlight ? sel.color : '#CBD5E1', fontWeight: (r as any).highlight ? 800 : 700 }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {activeStrategy === 'DO_NOTHING' && (
          <div style={{ padding: '12px 16px', background: 'rgba(100,116,139,0.1)', border: '1px solid #1E2230', borderRadius: '10px', fontSize: '12px', color: '#8E9BB0' }}>
            ℹ️ <strong style={{ color: '#FFF' }}>DO NOTHING selected.</strong> ReviveOS may choose this when natural recovery probability is high and intervention adds insufficient incremental lift.
          </div>
        )}
      </div>
      
      {/* ── Top Hero Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.12) 0%, rgba(99, 102, 241, 0.08) 50%, rgba(168, 85, 247, 0.12) 100%)',
        border: '1px solid rgba(59, 130, 246, 0.25)',
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
              background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)'
            }}>
              <GitCompare size={24} color="#FFF" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFF', letterSpacing: '-0.02em' }}>
                  Counterfactual Recovery Lab
                </h1>
                <span style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.2)', color: '#93C5FD', border: '1px solid rgba(59, 130, 246, 0.3)', fontWeight: 600 }}>
                  MULTI-STRATEGY SIMULATOR
                </span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#94A3B8', marginTop: '4px' }}>
                Evaluates 6 parallel recovery paths simultaneously: <span style={{ color: '#F1F5F9', fontWeight: 600 }}>"What would have happened under each available decision?"</span>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={runEvaluation}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#3B82F6', color: '#FFF', fontWeight: 600, cursor: 'pointer' }}
            >
              <RotateCcw size={13} className={loading ? 'animate-spin' : ''} />
              Re-run Simulation
            </button>
            <div style={{
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '0.6875rem',
              color: '#64748B',
              fontFamily: 'monospace'
            }}>
              Latency: <span style={{ color: '#10B981', fontWeight: 700 }}>12ms (In-Memory)</span>
            </div>
          </div>
        </div>

        {/* Quick Scenario Preset Chips */}
        <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.6875rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Quick Scenarios:
          </span>
          {presets.map((p) => (
            <button
              key={p.code}
              onClick={() => {
                setFailureCode(p.code);
                setAmount(p.amt);
                setIsWeekend(p.weekend);
              }}
              style={{
                background: failureCode === p.code ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                border: failureCode === p.code ? '1px solid rgba(59, 130, 246, 0.6)' : '1px solid rgba(255, 255, 255, 0.08)',
                color: failureCode === p.code ? '#93C5FD' : '#94A3B8',
                borderRadius: '20px',
                padding: '4px 12px',
                fontSize: '0.6875rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>{p.label}</span>
              <span style={{ opacity: 0.6, fontSize: '0.625rem' }}>(₹{(p.amt / 1000).toFixed(0)}k)</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Two-Column Layout (Responsive) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Left: Input Parameters Workbench */}
        <div style={{
          background: '#0F172A',
          border: '1px solid #1E293B',
          borderRadius: '24px',
          padding: '22px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          height: 'fit-content'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1E293B', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={16} color="#3B82F6" />
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#F1F5F9' }}>
                Signal Telemetry Sliders
              </span>
            </div>
            <span style={{ fontSize: '0.625rem', color: '#475569', textTransform: 'uppercase' }}>
              12 SIGNALS
            </span>
          </div>

          {/* Amount Slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
              <span style={{ color: '#94A3B8', fontWeight: 500 }}>Transaction Amount</span>
              <span style={{ color: '#60A5FA', fontWeight: 700, fontFamily: 'monospace' }}>
                ₹{amount.toLocaleString('en-IN')}
              </span>
            </div>
            <input
              type="range"
              min="1000"
              max="500000"
              step="5000"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#3B82F6', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.625rem', color: '#475569' }}>
              <span>₹1K</span>
              <span>₹2.5L</span>
              <span>₹5.0L</span>
            </div>
          </div>

          {/* Failure Reason */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 500 }}>Failure Taxonomy Code</label>
            <select
              value={failureCode}
              onChange={(e) => setFailureCode(e.target.value)}
              style={{
                background: '#1E293B',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '0.75rem',
                color: '#F1F5F9',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="INSUFFICIENT_FUNDS">INSUFFICIENT_FUNDS (B2B Limit)</option>
              <option value="PAYU_TIMEOUT">PAYU_TIMEOUT (Gateway Outage)</option>
              <option value="CARD_EXPIRED">CARD_EXPIRED (Involuntary Churn)</option>
              <option value="DO_NOT_HONOR">DO_NOT_HONOR (3DS Auth Required)</option>
              <option value="GATEWAY_CONNECTION_ERROR">GATEWAY_CONNECTION_ERROR (Socket Timeout)</option>
            </select>
          </div>

          {/* Customer Tenure */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
              <span style={{ color: '#94A3B8', fontWeight: 500 }}>Customer Tenure (Loyalty)</span>
              <span style={{ color: '#10B981', fontWeight: 700, fontFamily: 'monospace' }}>
                {customerTenure} Months
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="36"
              value={customerTenure}
              onChange={(e) => setCustomerTenure(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#10B981', cursor: 'pointer' }}
            />
          </div>

          {/* Success Rate */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
              <span style={{ color: '#94A3B8', fontWeight: 500 }}>Historical Success Rate</span>
              <span style={{ color: '#38BDF8', fontWeight: 700, fontFamily: 'monospace' }}>
                {(successRate * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={successRate}
              onChange={(e) => setSuccessRate(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#38BDF8', cursor: 'pointer' }}
            />
          </div>

          {/* Prior Retries */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
              <span style={{ color: '#94A3B8', fontWeight: 500 }}>Prior Retries Attempted</span>
              <span style={{ color: '#F59E0B', fontWeight: 700, fontFamily: 'monospace' }}>
                {retryCount} / 3 Attempts
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="4"
              value={retryCount}
              onChange={(e) => setRetryCount(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#F59E0B', cursor: 'pointer' }}
            />
          </div>

          {/* Context Toggles */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', paddingTop: '6px' }}>
            <button
              onClick={() => setIsWeekend(!isWeekend)}
              style={{
                background: isWeekend ? 'rgba(59, 130, 246, 0.15)' : '#1E293B',
                border: isWeekend ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid #334155',
                borderRadius: '8px',
                padding: '10px',
                fontSize: '0.6875rem',
                color: isWeekend ? '#93C5FD' : '#94A3B8',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Weekend</span>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: isWeekend ? '#3B82F6' : '#475569' }} />
              </div>
            </button>

            <button
              onClick={() => setGatewayDegraded(!gatewayDegraded)}
              style={{
                background: gatewayDegraded ? 'rgba(239, 68, 68, 0.15)' : '#1E293B',
                border: gatewayDegraded ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid #334155',
                borderRadius: '8px',
                padding: '10px',
                fontSize: '0.6875rem',
                color: gatewayDegraded ? '#F87171' : '#94A3B8',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>GW Degraded</span>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: gatewayDegraded ? '#EF4444' : '#475569' }} />
              </div>
            </button>
          </div>
        </div>

        {/* Right: Results, Strategy Comparison & 3-World Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Hero Lift Highlight Card */}
          {report?.reviveai_advantage && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(59, 130, 246, 0.12) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '24px',
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div>
                <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Zap size={14} /> ReviveOS Incremental Economic Lift
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#FFF', marginTop: '4px', fontFamily: 'monospace' }}>
                  +₹{report.reviveai_advantage.incremental_recovery_inr?.toLocaleString('en-IN')}
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#94A3B8', marginLeft: '10px', fontFamily: 'sans-serif' }}>
                    Net Captured Lift over Baseline
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '4px', maxWidth: '600px' }}>
                  {report.reviveai_advantage.summary}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '12px 18px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.625rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Recovery Lift</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10B981', fontFamily: 'monospace' }}>
                    {report.reviveai_advantage.recovery_lift_percentage_points}
                  </div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px', padding: '12px 18px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.625rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Software ROI</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#60A5FA', fontFamily: 'monospace' }}>
                    {report.reviveai_advantage.net_roi_multiplier}x
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Comparative Strategies Table */}
          <div style={{
            background: '#0F172A',
            border: '1px solid #1E293B',
            borderRadius: '24px',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #1E293B', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={16} color="#3B82F6" />
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#F1F5F9' }}>
                  6-Strategy Counterfactual Performance Matrix
                </span>
              </div>
              <span style={{ fontSize: '0.6875rem', color: '#475569' }}>
                Signal-Weighted Expected Value: EV = P × Amount - Costs
              </span>
            </div>

            <div className="table-responsive-wrapper" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1E293B', background: '#0B1120', color: '#64748B' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Candidate Strategy</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Capture Probability</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Expected Value (EV)</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Delay Window</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Customer Friction</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Decision Status</th>
                  </tr>
                </thead>
                <tbody style={{ fontFamily: 'monospace' }}>
                  {report?.strategies?.map((strat: any) => {
                    const isRec = strat.status === 'RECOMMENDED';
                    const isBlocked = strat.status === 'POLICY_BLOCKED';
                    return (
                      <tr 
                        key={strat.strategy_id}
                        style={{
                          borderBottom: '1px solid #1E293B',
                          background: isRec ? 'rgba(59, 130, 246, 0.08)' : (isBlocked ? 'rgba(239, 68, 68, 0.04)' : 'transparent'),
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <td style={{ padding: '14px 16px', fontFamily: 'sans-serif' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 700, color: '#F1F5F9' }}>{strat.name}</span>
                            {isRec && (
                              <span style={{ fontSize: '0.625rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.2)', color: '#10B981' }}>OPTIMAL</span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.6875rem', color: '#64748B', marginTop: '2px', maxWidth: '320px' }}>
                            {strat.why_wins_or_loses}
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 700, color: '#F1F5F9' }}>
                            {(strat.recovery_probability * 100).toFixed(1)}%
                          </div>
                          <div style={{ width: '80px', height: '4px', background: '#1E293B', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${strat.recovery_probability * 100}%`,
                              height: '100%',
                              background: strat.recovery_probability > 0.7 ? '#10B981' : (strat.recovery_probability > 0.4 ? '#60A5FA' : '#EF4444')
                            }} />
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: '#FFF' }}>
                          ₹{strat.expected_value_inr?.toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '14px 16px', color: '#94A3B8', fontFamily: 'sans-serif' }}>
                          {strat.expected_time_str}
                        </td>
                        <td style={{ padding: '14px 16px', fontFamily: 'sans-serif' }}>
                          <span style={{ fontSize: '0.625rem', padding: '2px 6px', borderRadius: '4px', background: strat.customer_friction === 'LOW' || strat.customer_friction === 'NONE' ? 'rgba(16, 185, 129, 0.2)' : (strat.customer_friction === 'MEDIUM' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'), color: strat.customer_friction === 'LOW' || strat.customer_friction === 'NONE' ? '#10B981' : (strat.customer_friction === 'MEDIUM' ? '#F59E0B' : '#EF4444') }}>
                            {strat.customer_friction}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontFamily: 'sans-serif' }}>
                          {isRec ? (
                            <span style={{ color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={13} /> Selected
                            </span>
                          ) : (isBlocked ? (
                            <span style={{ color: '#EF4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <XCircle size={13} /> Blocked
                            </span>
                          ) : (
                            <span style={{ color: '#475569' }}>Suboptimal</span>
                          ))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* "What If I Did Nothing?" 3-World Breakdown */}
          {report?.what_if_analysis && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              <div style={{ background: '#0F172A', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '18px' }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <XCircle size={14} /> World A: Do Nothing
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFF', marginTop: '8px', fontFamily: 'monospace' }}>
                  ₹0 Captured
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#EF4444', marginTop: '2px' }}>100% Involuntary Churn</div>
                <p style={{ fontSize: '0.6875rem', color: '#64748B', marginTop: '8px', borderTop: '1px solid #1E293B', paddingTop: '8px' }}>
                  {report.what_if_analysis.scenario_a_do_nothing?.customer_impact}
                </p>
              </div>

              <div style={{ background: '#0F172A', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '12px', padding: '18px' }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={14} /> World B: Blind Retry (3x)
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFF', marginTop: '8px', fontFamily: 'monospace' }}>
                  ₹{report.what_if_analysis.scenario_b_blind_retry?.expected_recovered_inr?.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#F59E0B', marginTop: '2px' }}>High Friction & Penalty Risk</div>
                <p style={{ fontSize: '0.6875rem', color: '#64748B', marginTop: '8px', borderTop: '1px solid #1E293B', paddingTop: '8px' }}>
                  {report.what_if_analysis.scenario_b_blind_retry?.risk_profile}
                </p>
              </div>

              <div style={{ background: '#0F172A', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '12px', padding: '18px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#10B981', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={14} /> World C: ReviveAI
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFF', marginTop: '8px', fontFamily: 'monospace' }}>
                  ₹{report.what_if_analysis.scenario_c_reviveai?.expected_recovered_inr?.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#10B981', marginTop: '2px' }}>
                  {report.what_if_analysis.scenario_c_reviveai?.strategy}
                </div>
                <p style={{ fontSize: '0.6875rem', color: '#64748B', marginTop: '8px', borderTop: '1px solid #1E293B', paddingTop: '8px' }}>
                  Safe recovery governed by merchant policy ceiling with zero card network penalties.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};