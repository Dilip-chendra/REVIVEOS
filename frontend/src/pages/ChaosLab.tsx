import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, Terminal, CheckCircle2, XCircle, Play, 
  RefreshCw, ShieldCheck, Lock, Sparkles, Key, RotateCcw,
  Cpu, Network, Sliders
} from 'lucide-react';
import { getChaosDrills, runChaosDrill, getResilienceReport } from '../api/client';

export const ChaosLab: React.FC = () => {
  const [drills, setDrills] = useState<any[]>([]);
  const [resilience, setResilience] = useState<any>(null);
  const [activeResults, setActiveResults] = useState<Record<string, any>>({});
  const [executing, setExecuting] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState<boolean>(false);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  const loadData = async () => {
    try {
      const [drillsData, report] = await Promise.all([getChaosDrills(), getResilienceReport()]);
      setDrills(drillsData.drills || []);
      setResilience(report);
    } catch (e) {
      console.error('Failed to load chaos drills:', e);
    }
  };

  const handleRunDrill = async (drillId: string) => {
    setExecuting(drillId);
    try {
      const res = await runChaosDrill(drillId);
      setActiveResults(prev => ({ ...prev, [drillId]: res }));
      const updatedReport = await getResilienceReport();
      setResilience(updatedReport);
    } catch (e) {
      console.error(`Drill ${drillId} failed:`, e);
    } finally {
      setExecuting(null);
    }
  };

  const handleRunAll = async () => {
    setRunningAll(true);
    for (const d of drills) {
      await handleRunDrill(d.id);
    }
    setRunningAll(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const getCategoryMeta = (cat: string) => {
    const clean = (cat || '').toUpperCase();
    if (clean.includes('AI') || clean.includes('ADVERSARIAL')) {
      return { label: 'AI Safety', color: '#A855F7', bg: 'rgba(168, 85, 247, 0.12)', border: 'rgba(168, 85, 247, 0.3)', icon: Sparkles };
    }
    if (clean.includes('AUTH') || clean.includes('SECURITY')) {
      return { label: 'Authentication', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', icon: Key };
    }
    if (clean.includes('REPLAY') || clean.includes('CONCURRENCY')) {
      return { label: 'Replay Shield', color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.12)', border: 'rgba(6, 182, 212, 0.3)', icon: RotateCcw };
    }
    if (clean.includes('FINANCIAL') || clean.includes('INTEGRITY')) {
      return { label: 'Financial Safety', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)', icon: ShieldCheck };
    }
    if (clean.includes('BOUNDARY') || clean.includes('POLICY')) {
      return { label: 'Policy Boundary', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)', icon: Sliders };
    }
    if (clean.includes('RESILIENCE')) {
      return { label: 'System Resilience', color: '#6366F1', bg: 'rgba(99, 102, 241, 0.12)', border: 'rgba(99, 102, 241, 0.3)', icon: Cpu };
    }
    if (clean.includes('DISTRIBUTED') || clean.includes('SYSTEM')) {
      return { label: 'Distributed Systems', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.12)', border: 'rgba(56, 189, 248, 0.3)', icon: Network };
    }
    return { label: cat || 'Security', color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.3)', icon: Lock };
  };

  const executedCount = Object.keys(activeResults).length;
  const defendedCount = Object.values(activeResults).filter((r: any) => r?.defense_successful).length;

  const filteredDrills = filterCategory === 'ALL' 
    ? drills 
    : drills.filter(d => getCategoryMeta(d.category).label === filterCategory);

  const categories = ['ALL', ...Array.from(new Set(drills.map(d => getCategoryMeta(d.category).label)))];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', paddingBottom: '60px' }}>
      
      {/* ── Top Hero Command Banner ── */}
      <motion.div 
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(139, 92, 246, 0.08) 50%, rgba(15, 23, 42, 0.95) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          borderRadius: '24px',
          padding: 'clamp(20px, 3vw, 32px)',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 24px rgba(239, 68, 68, 0.5)',
              flexShrink: 0,
            }}>
              <ShieldAlert size={26} color="#FFF" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 'clamp(1.25rem, 2.5vw, 1.625rem)', fontWeight: 800, color: '#FFF', letterSpacing: '-0.02em', margin: 0 }}>
                  Chaos & Red Team Security Lab
                </h1>
                <span style={{ fontSize: '0.6875rem', padding: '3px 9px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.2)', color: '#FCA5A5', border: '1px solid rgba(239, 68, 68, 0.35)', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                  ACTIVE DEFENSIVE RED-TEAMING
                </span>
              </div>
              <p style={{ fontSize: '0.84rem', color: '#94A3B8', marginTop: '6px', maxWidth: '780px', lineHeight: 1.5, margin: '6px 0 0 0' }}>
                Adversarial test harness executing real attacks against the payment pipeline: prompt injection bypasses, HMAC signature tampering, concurrency race conditions, and cross-tenant isolation.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{
              background: 'rgba(0, 0, 0, 0.6)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: '14px',
              padding: '10px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              minWidth: '150px',
            }}>
              <div style={{ fontSize: '0.625rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>
                Resilience Status
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#10B981', fontFamily: 'var(--font-mono)' }}>
                {executedCount > 0 ? `${defendedCount} / ${executedCount} DEFENDED` : (resilience?.resilience_score || '8 / 8 ACTIVE (100%)')}
              </div>
            </div>

            <button
              onClick={handleRunAll}
              disabled={runningAll}
              className="btn btn-primary"
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
                color: '#FFF',
                borderRadius: '14px',
                fontSize: '0.84rem',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)',
                opacity: runningAll ? 0.6 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              <Play size={15} fill="#FFF" className={runningAll ? 'animate-spin' : ''} />
              <span>{runningAll ? 'Running All 8 Drills...' : 'Execute All 8 Drills'}</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Category Filter Pills ── */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: filterCategory === cat ? 800 : 600,
              background: filterCategory === cat ? '#1E293B' : 'rgba(15, 23, 42, 0.6)',
              border: `1px solid ${filterCategory === cat ? '#38BDF8' : '#1E293B'}`,
              color: filterCategory === cat ? '#38BDF8' : '#94A3B8',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {cat === 'ALL' ? 'All Drills (8)' : cat}
          </button>
        ))}
      </div>

      {/* ── 8 Drills Grid (Responsive Auto-Fit) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        {filteredDrills.map((drill) => {
          const res = activeResults[drill.id];
          const isRunning = executing === drill.id;
          const meta = getCategoryMeta(drill.category);
          const Icon = meta.icon;

          return (
            <motion.div 
              key={drill.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              style={{
                background: 'linear-gradient(180deg, #0F172A 0%, #0B1120 100%)',
                border: res 
                  ? (res.defense_successful ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(239, 68, 68, 0.4)')
                  : '1px solid #1E293B',
                borderRadius: '20px',
                padding: '22px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '18px',
                boxShadow: res?.defense_successful 
                  ? '0 8px 30px rgba(16, 185, 129, 0.08)' 
                  : '0 8px 24px rgba(0,0,0,0.3)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Card Header: Category & Target Component */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: '0.6875rem',
                    fontWeight: 800,
                    padding: '3px 9px',
                    borderRadius: '6px',
                    background: meta.bg,
                    color: meta.color,
                    border: `1px solid ${meta.border}`,
                    whiteSpace: 'nowrap',
                  }}>
                    <Icon size={12} />
                    <span>{meta.label}</span>
                  </span>

                  <span 
                    title={drill.target}
                    style={{
                      fontSize: '0.6875rem',
                      fontFamily: 'var(--font-mono)',
                      color: '#94A3B8',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      maxWidth: '180px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {drill.target}
                  </span>
                </div>

                {/* Drill Title */}
                <div>
                  <h3 style={{ fontSize: '1.025rem', fontWeight: 800, color: '#FFF', letterSpacing: '-0.01em', margin: 0, lineHeight: 1.35 }}>
                    {drill.name}
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: '#94A3B8', lineHeight: 1.5, marginTop: '6px', marginBottom: 0 }}>
                    {drill.description}
                  </p>
                </div>

                {/* Expected Defense Box */}
                <div style={{
                  background: 'rgba(11, 17, 32, 0.8)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.6875rem', fontWeight: 800, color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <ShieldCheck size={13} color="#60A5FA" />
                    <span>Expected Defense Firewall</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#CBD5E1', lineHeight: 1.45 }}>
                    {drill.expected_outcome}
                  </div>
                </div>
              </div>

              {/* Execution Result Terminal Output */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <AnimatePresence>
                  {res && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '12px',
                        background: res.defense_successful ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        border: res.defense_successful ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                        <span style={{ color: res.defense_successful ? '#10B981' : '#EF4444', fontWeight: 800, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          {res.defense_successful ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                          <span>{res.defense_successful ? 'ATTACK DEFENDED' : 'DEFENSE FAILED'}</span>
                        </span>
                        <span style={{ fontSize: '0.625rem', fontFamily: 'var(--font-mono)', color: '#94A3B8', background: 'rgba(0,0,0,0.4)', padding: '2px 6px', borderRadius: 4 }}>
                          {res.defense_layer}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#F1F5F9', lineHeight: 1.45, fontFamily: 'var(--font-mono)' }}>
                        {res.conclusion}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Drill Trigger Button */}
                <button
                  onClick={() => handleRunDrill(drill.id)}
                  disabled={isRunning}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    borderRadius: '10px',
                    background: res 
                      ? '#1E293B' 
                      : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.1) 100%)',
                    border: res 
                      ? '1px solid #334155' 
                      : '1px solid rgba(239, 68, 68, 0.45)',
                    color: '#FFF',
                    fontSize: '0.78125rem',
                    fontWeight: 700,
                    cursor: isRunning ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease',
                    opacity: isRunning ? 0.6 : 1,
                  }}
                >
                  {isRunning ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Executing Vector Attack...</span>
                    </>
                  ) : (
                    <>
                      <Terminal size={13} color={res ? '#38BDF8' : '#EF4444'} />
                      <span>{res ? 'Re-Test Attack Vector' : 'Run Attack Drill'}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

    </div>
  );
};