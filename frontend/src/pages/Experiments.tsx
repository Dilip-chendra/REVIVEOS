import React, { useState, useEffect } from 'react';
import { 
  FlaskConical, RefreshCw, Award
} from 'lucide-react';
import { useAppMode } from '../context/AppModeContext';
import { runABExperiment, getCalibrationCurve, getPerformanceMatrix } from '../api/client';

export const Experiments: React.FC = () => {
  const { isRealMode, currentMode } = useAppMode();
  const [cohortSize, setCohortSize] = useState<number>(500);
  const [abData, setAbData] = useState<any>(null);
  const [calibration, setCalibration] = useState<any>(null);
  const [matrix, setMatrix] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const runAll = async () => {
    setLoading(true);
    try {
      const [ab, cal, mat] = await Promise.all([
        runABExperiment(cohortSize),
        getCalibrationCurve(),
        getPerformanceMatrix(),
      ]);
      setAbData(ab);
      setCalibration(cal);
      setMatrix(mat);
    } catch (e) {
      console.error('Failed to run experiment suite:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAll();
  }, [cohortSize, currentMode, isRealMode]);

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* ── Top Hero Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(59, 130, 246, 0.08) 50%, rgba(99, 102, 241, 0.08) 100%)',
        border: '1px solid rgba(6, 182, 212, 0.3)',
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
              background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)'
            }}>
              <FlaskConical size={24} color="#FFF" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFF', letterSpacing: '-0.02em' }}>
                  Experimentation & Strategy Backtest
                </h1>
                <span style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: '12px', background: isRealMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(6, 182, 212, 0.2)', color: isRealMode ? '#10B981' : '#67E8F9', border: isRealMode ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(6, 182, 212, 0.3)', fontWeight: 700, fontFamily: 'monospace' }}>
                  {isRealMode ? 'REAL RAZORPAY BACKTEST HARNESS' : 'A/B STATISTICAL BENCHMARKS (p < 0.001)'}
                </span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#94A3B8', marginTop: '4px' }}>
                Empirical split testing: Control (Standard Blind Retry) vs Treatment (ReviveOS Dual-Engine) and 5-bin calibration verification.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <select
              value={cohortSize}
              onChange={(e) => setCohortSize(Number(e.target.value))}
              style={{
                background: '#1E293B',
                border: '1px solid #334155',
                borderRadius: '10px',
                padding: '8px 14px',
                fontSize: '0.75rem',
                color: '#FFF',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="200">Cohort: 200 Cases</option>
              <option value="500">Cohort: 500 Cases</option>
              <option value="1000">Cohort: 1,000 Cases</option>
            </select>

            <button
              onClick={runAll}
              disabled={loading}
              style={{
                padding: '8px 18px',
                background: 'linear-gradient(135deg, #06B6D4 0%, #0284C7 100%)',
                color: '#FFF',
                borderRadius: '10px',
                fontSize: '0.75rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 14px rgba(6, 182, 212, 0.3)',
                opacity: loading ? 0.5 : 1
              }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Re-Run Backtest</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── A/B Test Lift Headline Banner ── */}
      {abData && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          borderRadius: '24px',
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#67E8F9', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Award size={14} /> Statistically Significant Recovery Lift (p &lt; 0.001)
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#FFF', marginTop: '4px', fontFamily: 'monospace' }}>
              {abData.economic_lift?.recovery_rate_lift_pp}
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#94A3B8', marginLeft: '10px', fontFamily: 'sans-serif' }}>
                Lift in Gross Captured Recovery Rate
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '4px', maxWidth: '650px' }}>
              {abData.economic_lift?.conclusion}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', fontFamily: 'monospace' }}>
            <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '12px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.625rem', color: '#64748B', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>Incremental Revenue</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>
                +₹{abData.economic_lift?.incremental_revenue_inr?.toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '12px', padding: '12px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.625rem', color: '#64748B', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>Retries Avoided</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#67E8F9', marginTop: '2px' }}>
                {abData.economic_lift?.retries_avoided_count} attempts
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Control vs Treatment Direct Cohort Comparison Cards ── */}
      {abData && (
        <div className="grid-responsive-2">
          
          {/* Control Card */}
          <div style={{
            background: '#0F172A',
            border: '1px solid #1E293B',
            borderRadius: '24px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1E293B', paddingBottom: '12px' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#94A3B8' }}>Control Group: Blind Retries (Industry Standard)</div>
              <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#64748B' }}>{abData.control_group?.cohort_cases} Cases</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.75rem', fontFamily: 'monospace' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1E293B', paddingBottom: '8px' }}>
                <span style={{ color: '#94A3B8', fontFamily: 'sans-serif' }}>Recovery Rate:</span>
                <span style={{ fontWeight: 800, color: '#E2E8F0' }}>{abData.control_group?.recovery_rate_percentage}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1E293B', paddingBottom: '8px' }}>
                <span style={{ color: '#94A3B8', fontFamily: 'sans-serif' }}>Total Revenue Recovered:</span>
                <span style={{ fontWeight: 800, color: '#E2E8F0' }}>₹{abData.control_group?.recovered_revenue_inr?.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1E293B', paddingBottom: '8px' }}>
                <span style={{ color: '#94A3B8', fontFamily: 'sans-serif' }}>Average Retries Per Case:</span>
                <span style={{ fontWeight: 800, color: '#F59E0B' }}>{abData.control_group?.average_attempts_per_case} attempts</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1E293B', paddingBottom: '8px' }}>
                <span style={{ color: '#94A3B8', fontFamily: 'sans-serif' }}>Customer Friction Score:</span>
                <span style={{ fontWeight: 800, color: '#EF4444' }}>{abData.control_group?.customer_friction_score}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94A3B8', fontFamily: 'sans-serif' }}>Card Velocity Penalty Risk:</span>
                <span style={{ fontWeight: 800, color: '#EF4444' }}>{abData.control_group?.visa_mcc_risk}</span>
              </div>
            </div>
          </div>

          {/* Treatment Card */}
          <div style={{
            background: '#0F172A',
            border: '1px solid rgba(6, 182, 212, 0.4)',
            borderRadius: '24px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1E293B', paddingBottom: '12px' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#67E8F9' }}>Treatment Group: ReviveOS Dual-Engine</div>
              <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#67E8F9' }}>{abData.treatment_group?.cohort_cases} Cases</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.75rem', fontFamily: 'monospace' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1E293B', paddingBottom: '8px' }}>
                <span style={{ color: '#94A3B8', fontFamily: 'sans-serif' }}>Recovery Rate:</span>
                <span style={{ fontWeight: 800, color: '#10B981' }}>{abData.treatment_group?.recovery_rate_percentage}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1E293B', paddingBottom: '8px' }}>
                <span style={{ color: '#94A3B8', fontFamily: 'sans-serif' }}>Total Revenue Recovered:</span>
                <span style={{ fontWeight: 800, color: '#10B981' }}>₹{abData.treatment_group?.recovered_revenue_inr?.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1E293B', paddingBottom: '8px' }}>
                <span style={{ color: '#94A3B8', fontFamily: 'sans-serif' }}>Average Actions Per Case:</span>
                <span style={{ fontWeight: 800, color: '#60A5FA' }}>{abData.treatment_group?.average_attempts_per_case} actions</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1E293B', paddingBottom: '8px' }}>
                <span style={{ color: '#94A3B8', fontFamily: 'sans-serif' }}>Customer Friction Score:</span>
                <span style={{ fontWeight: 800, color: '#10B981' }}>{abData.treatment_group?.customer_friction_score}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94A3B8', fontFamily: 'sans-serif' }}>Card Velocity Penalty Risk:</span>
                <span style={{ fontWeight: 800, color: '#10B981' }}>{abData.treatment_group?.visa_mcc_risk}</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── Calibration Curves & Historical Matrix (Responsive) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Left: Calibration */}
        <div style={{
          background: '#0F172A',
          border: '1px solid #1E293B',
          borderRadius: '24px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1E293B', paddingBottom: '12px' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#F1F5F9' }}>Probabilistic Calibration Curve</h3>
            <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#10B981', fontWeight: 800 }}>Brier: {calibration?.brier_score}</span>
          </div>

          <p style={{ fontSize: '0.6875rem', color: '#64748B', lineHeight: 1.4 }}>
            Compares predicted confidence bands against empirical observed recovery rates to verify model calibration.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {calibration?.calibration_buckets?.map((b: any, i: number) => (
              <div key={i} style={{ padding: '10px 14px', background: '#1E293B', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', fontFamily: 'monospace' }}>
                  <span style={{ color: '#94A3B8', fontFamily: 'sans-serif' }}>{b.predicted_band}</span>
                  <span style={{ color: '#10B981', fontWeight: 800 }}>{b.observed_success_rate}% Observed</span>
                </div>
                <div style={{ width: '100%', height: '4px', background: '#334155', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${b.observed_success_rate}%`, height: '100%', background: '#06B6D4' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Strategy Matrix */}
        <div style={{
          background: '#0F172A',
          border: '1px solid #1E293B',
          borderRadius: '24px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1E293B', paddingBottom: '12px' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#F1F5F9' }}>Historical Strategy Performance Matrix</h3>
            <span style={{ fontSize: '0.6875rem', color: '#64748B' }}>1,000 Sandbox Benchmark Cohorts</span>
          </div>

          <div className="table-responsive-wrapper" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.75rem', minWidth: '540px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1E293B', color: '#64748B' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Strategy</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Capture Rate</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Avg Delay</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Customer Friction</th>
                </tr>
              </thead>
              <tbody style={{ fontFamily: 'monospace' }}>
                {matrix.map((m, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #1E293B' }}>
                    <td style={{ padding: '12px 14px', fontFamily: 'sans-serif' }}>
                      <div style={{ fontWeight: 700, color: '#F1F5F9' }}>{m.strategy}</div>
                      <div style={{ fontSize: '0.6875rem', color: '#64748B', marginTop: '2px' }}>{m.top_scenario}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: '#10B981' }}>{(m.recovery_rate * 100).toFixed(1)}%</td>
                    <td style={{ padding: '12px 14px', color: '#94A3B8', fontFamily: 'sans-serif' }}>{m.avg_recovery_time}</td>
                    <td style={{ padding: '12px 14px', fontFamily: 'sans-serif' }}>
                      <span style={{
                        fontSize: '0.625rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: m.customer_friction === 'LOW' || m.customer_friction === 'ZERO' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: m.customer_friction === 'LOW' || m.customer_friction === 'ZERO' ? '#10B981' : '#F59E0B',
                        fontWeight: 700
                      }}>
                        {m.customer_friction}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
};