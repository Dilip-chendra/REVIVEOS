import React, { useState, useEffect } from 'react';
import { 
  Network, Activity, Play, Clock, CheckCircle2
} from 'lucide-react';
import { useAppMode } from '../context/AppModeContext';
import { getIncidents, triggerCanary, resolveIncident, simulateLiveTraffic } from '../api/client';

export const GatewayCommander: React.FC = () => {
  const { isRealMode, currentMode } = useAppMode();
  const [incidents, setIncidents] = useState<any[]>([]);
  
  // Traffic simulator
  const [reqCount, setReqCount] = useState<number>(100);
  const [payuError, setPayuError] = useState<number>(0.35);
  const [simTrafficResult, setSimTrafficResult] = useState<any>(null);
  const [simulatingTraffic, setSimulatingTraffic] = useState<boolean>(false);

  const loadIncidents = async () => {
    try {
      const data = await getIncidents();
      setIncidents(data || []);
    } catch (e) {
      console.error('Failed to load incidents:', e);
    }
  };

  const handleCanary = async () => {
    try {
      await triggerCanary(15);
      await loadIncidents();
    } catch (e) {
      console.error('Canary error:', e);
    }
  };

  const handleResolve = async () => {
    try {
      await resolveIncident();
      await loadIncidents();
    } catch (e) {
      console.error('Resolve error:', e);
    }
  };

  const handleRunTraffic = async () => {
    setSimulatingTraffic(true);
    try {
      const res = await simulateLiveTraffic({
        requests_count: reqCount,
        payu_error_rate: payuError,
        razorpay_error_rate: 0.03,
        cashfree_error_rate: 0.04,
      });
      setSimTrafficResult(res);
    } catch (e) {
      console.error('Traffic simulation error:', e);
    } finally {
      setSimulatingTraffic(false);
    }
  };

  useEffect(() => {
    loadIncidents();
    handleRunTraffic();
  }, [currentMode, isRealMode]);

  const activeInc = incidents[0];

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* ── Top Hero Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.12) 0%, rgba(239, 68, 68, 0.08) 50%, rgba(139, 92, 246, 0.08) 100%)',
        border: '1px solid rgba(249, 115, 22, 0.3)',
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
              background: 'linear-gradient(135deg, #F97316 0%, #EF4444 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(249, 115, 22, 0.4)'
            }}>
              <Network size={24} color="#FFF" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFF', letterSpacing: '-0.02em' }}>
                  Gateway Incident Commander
                </h1>
                <span style={{
                  fontSize: '0.6875rem',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: !activeInc ? 'rgba(16, 185, 129, 0.2)' : activeInc?.status === 'RESOLVED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: !activeInc ? '#10B981' : activeInc?.status === 'RESOLVED' ? '#10B981' : '#EF4444',
                  border: !activeInc ? '1px solid rgba(16, 185, 129, 0.4)' : activeInc?.status === 'RESOLVED' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                  fontWeight: 700,
                  fontFamily: 'monospace'
                }}>
                  {!activeInc ? '● ALL SYSTEMS HEALTHY • 0 INCIDENTS' : (activeInc?.status || 'INCIDENT ACTIVE')}
                </span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#94A3B8', marginTop: '4px' }}>
                Sub-2-second automated multi-processor failover, live traffic generation, and canary health probing.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {activeInc && activeInc?.status !== 'RESOLVED' && (
              <>
                <button
                  onClick={handleCanary}
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(245, 158, 11, 0.2)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    color: '#FBBF24',
                    borderRadius: '10px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Trigger 15% Canary Probe
                </button>
                <button
                  onClick={handleResolve}
                  style={{
                    padding: '8px 18px',
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    color: '#FFF',
                    borderRadius: '10px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  Resolve & Restore Normal Route
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Active Incident Telemetry Box (or Zero-Incident Nominal State) ── */}
      {activeInc ? (
        <div style={{
          background: '#0F172A',
          border: '1px solid #1E293B',
          borderRadius: '24px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid #1E293B', paddingBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '0.6875rem', color: '#F97316', fontWeight: 800, textTransform: 'uppercase', fontFamily: 'monospace' }}>
                {activeInc.incident_id} • Severity: {activeInc.severity}
              </div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#FFF', marginTop: '4px' }}>
                PayU Socket Degradation (34.0% Timeout Spike)
              </h2>
              <p style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '2px' }}>{activeInc.mitigation_strategy}</p>
            </div>

            <div style={{ display: 'flex', gap: '12px', fontFamily: 'monospace' }}>
              <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '12px 18px', textAlign: 'right' }}>
                <div style={{ fontSize: '0.625rem', color: '#64748B', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>Revenue Exposed</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#EF4444' }}>₹{activeInc.revenue_exposed_inr?.toLocaleString('en-IN')}</div>
              </div>
              <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '12px 18px', textAlign: 'right' }}>
                <div style={{ fontSize: '0.625rem', color: '#64748B', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>Revenue Rescued</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#10B981' }}>₹{activeInc.revenue_rescued_inr?.toLocaleString('en-IN')}</div>
              </div>
            </div>
          </div>

          {/* 3-Node Topology Distribution Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#E2E8F0' }}>Live Dynamic Multi-Node Traffic Allocation</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              
              {/* Razorpay Node */}
              <div style={{ background: '#1E293B', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: '16px', padding: '18px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>Razorpay Processor</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#60A5FA', fontFamily: 'monospace', marginTop: '4px' }}>
                  {activeInc.routing_allocation?.razorpay || 70}%
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#10B981', marginTop: '4px', fontWeight: 600 }}>● Primary Route (Healthy • 98.2%)</div>
              </div>

              {/* Cashfree Node */}
              <div style={{ background: '#1E293B', border: '1px solid rgba(139, 92, 246, 0.4)', borderRadius: '16px', padding: '18px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>Cashfree Processor</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#C4B5FD', fontFamily: 'monospace', marginTop: '4px' }}>
                  {activeInc.routing_allocation?.cashfree || 30}%
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#10B981', marginTop: '4px', fontWeight: 600 }}>● Secondary Route (Healthy • 97.8%)</div>
              </div>

              {/* PayU Node */}
              <div style={{
                background: activeInc.routing_allocation?.payu > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: activeInc.routing_allocation?.payu > 0 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '16px',
                padding: '18px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>PayU Processor</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#EF4444', fontFamily: 'monospace', marginTop: '4px' }}>
                  {activeInc.routing_allocation?.payu || 0}%
                </div>
                <div style={{ fontSize: '0.6875rem', color: activeInc.routing_allocation?.payu > 0 ? '#FBBF24' : '#F87171', marginTop: '4px', fontWeight: 600 }}>
                  {activeInc.routing_allocation?.payu > 0 ? `▲ Canary Active (${activeInc.canary_percentage}%)` : '✖ Quarantined / 0% Allocation'}
                </div>
              </div>

            </div>
          </div>

          {/* Incident Timeline */}
          <div style={{ borderTop: '1px solid #1E293B', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} /> Incident Event Timeline
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeInc.timeline?.map((evt: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '0.75rem' }}>
                  <span style={{ fontFamily: 'monospace', color: '#64748B', width: '90px', flexShrink: 0 }}>{evt.time}</span>
                  <span style={{ color: '#E2E8F0' }}>{evt.event}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          background: '#0F172A',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '24px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid #1E293B', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={22} color="#10B981" />
              </div>
              <div>
                <div style={{ fontSize: '0.6875rem', color: '#10B981', fontWeight: 800, textTransform: 'uppercase', fontFamily: 'monospace' }}>
                  TELEMETRY NORMAL • ZERO PROCESSOR OUTAGES
                </div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#FFF', marginTop: '2px' }}>
                  {isRealMode ? 'Razorpay Production Rails Active' : 'All Gateway Processors Nominal'}
                </h2>
                <p style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '2px' }}>
                  Sub-2s automated failover circuits armed. No gateway timeouts, rate-limit throttles, or latency spikes detected.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', fontFamily: 'monospace' }}>
              <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '12px 18px', textAlign: 'right' }}>
                <div style={{ fontSize: '0.625rem', color: '#64748B', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>Processor Health</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#10B981' }}>100.0%</div>
              </div>
              <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '12px 18px', textAlign: 'right' }}>
                <div style={{ fontSize: '0.625rem', color: '#64748B', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>Active Incidents</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#10B981' }}>0</div>
              </div>
            </div>
          </div>

          {/* 3-Node Topology Distribution Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#E2E8F0' }}>Live Dynamic Multi-Node Traffic Allocation</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              
              {/* Razorpay Node */}
              <div style={{ background: '#1E293B', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '16px', padding: '18px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>Razorpay Processor</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10B981', fontFamily: 'monospace', marginTop: '4px' }}>
                  100%
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#10B981', marginTop: '4px', fontWeight: 600 }}>● Primary Active Route (Verified Healthy)</div>
              </div>

              {/* Cashfree Node */}
              <div style={{ background: '#1E293B', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '16px', padding: '18px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>Cashfree Processor</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#C4B5FD', fontFamily: 'monospace', marginTop: '4px' }}>
                  0%
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#94A3B8', marginTop: '4px', fontWeight: 600 }}>● Standby Secondary Route (Armed)</div>
              </div>

              {/* PayU Node */}
              <div style={{ background: '#1E293B', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '16px', padding: '18px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>PayU Processor</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#FCD34D', fontFamily: 'monospace', marginTop: '4px' }}>
                  0%
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#94A3B8', marginTop: '4px', fontWeight: 600 }}>● Standby Tertiary Route (Armed)</div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── Live Backend Traffic Simulator Section ── */}
      <div style={{
        background: '#0F172A',
        border: '1px solid #1E293B',
        borderRadius: '24px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1E293B', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={20} color="#3B82F6" />
            <div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#F1F5F9' }}>
                Live Gateway Traffic Generator
              </h3>
              <p style={{ fontSize: '0.6875rem', color: '#64748B' }}>
                Inject synthetic checkout volume and test dynamic failover capture rates
              </p>
            </div>
          </div>

          <button
            onClick={handleRunTraffic}
            disabled={simulatingTraffic}
            style={{
              padding: '8px 18px',
              background: '#3B82F6',
              color: '#FFF',
              borderRadius: '10px',
              fontSize: '0.75rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: simulatingTraffic ? 0.5 : 1
            }}
          >
            <Play size={13} fill="#FFF" className={simulatingTraffic ? 'animate-spin' : ''} />
            <span>Simulate 100 Checkouts</span>
          </button>
        </div>

        {/* Sliders */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span style={{ color: '#94A3B8' }}>Transaction Batch Volume</span>
              <span style={{ color: '#60A5FA', fontWeight: 800, fontFamily: 'monospace' }}>{reqCount} Requests</span>
            </div>
            <input
              type="range"
              min="20"
              max="500"
              step="20"
              value={reqCount}
              onChange={(e) => setReqCount(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#3B82F6', cursor: 'pointer' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span style={{ color: '#94A3B8' }}>Injected PayU Failure Rate</span>
              <span style={{ color: '#EF4444', fontWeight: 800, fontFamily: 'monospace' }}>{(payuError * 100).toFixed(0)}% Error</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="0.60"
              step="0.05"
              value={payuError}
              onChange={(e) => setPayuError(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#EF4444', cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* Output Metrics */}
        {simTrafficResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid #1E293B', paddingTop: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', fontFamily: 'monospace' }}>
              <div style={{ padding: '12px 16px', background: '#1E293B', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.625rem', color: '#64748B', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>Throughput</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#FFF', marginTop: '2px' }}>{simTrafficResult.traffic_generator?.throughput_rps} req/s</div>
              </div>
              <div style={{ padding: '12px 16px', background: '#1E293B', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.625rem', color: '#64748B', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>Capture Rate</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>{simTrafficResult.telemetry_metrics?.overall_success_rate}</div>
              </div>
              <div style={{ padding: '12px 16px', background: '#1E293B', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.625rem', color: '#64748B', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>Rescued Revenue</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#60A5FA', marginTop: '2px' }}>₹{simTrafficResult.telemetry_metrics?.successful_revenue_inr?.toLocaleString('en-IN')}</div>
              </div>
              <div style={{ padding: '12px 16px', background: '#1E293B', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.625rem', color: '#64748B', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>Routing Latency</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#C4B5FD', marginTop: '2px' }}>{simTrafficResult.telemetry_metrics?.avg_response_time_ms} ms</div>
              </div>
            </div>

            <div style={{
              padding: '12px 16px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: '12px',
              fontSize: '0.75rem',
              color: '#93C5FD'
            }}>
              {simTrafficResult.router_conclusion}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};