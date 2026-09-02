import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { getTerm, getFriendlyStatus } from '../utils/businessLanguage';

interface ExplainableTermProps {
  termKey: string;
  customText?: string;
  inline?: boolean;
}

export const ExplainableTerm: React.FC<ExplainableTermProps> = ({
  termKey,
  customText,
  inline = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const term = getTerm(termKey);

  return (
    <span style={{ position: 'relative', display: inline ? 'inline-flex' : 'flex', alignItems: 'center', gap: '4px' }}>
      <span style={{ fontWeight: 600, color: 'inherit' }}>
        {customText || term.displayName}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        title="What does this mean?"
        style={{
          background: 'none',
          border: 'none',
          padding: '0 2px',
          cursor: 'pointer',
          color: '#94A3B8',
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        <HelpCircle size={13} style={{ opacity: 0.7 }} />
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '0',
            marginBottom: '8px',
            width: '280px',
            background: '#0F172A',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
            zIndex: 100,
            fontSize: '12px',
            color: '#F8FAFC',
            lineHeight: 1.5,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontWeight: 700, color: '#38BDF8', fontSize: '13px' }}>{term.displayName}</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '12px' }}
            >
              ✕
            </button>
          </div>
          <div style={{ color: '#E2E8F0', marginBottom: '8px' }}>
            {term.businessExplanation}
          </div>
          {term.technicalDetails && (
            <div style={{ padding: '6px 8px', background: 'rgba(30, 41, 59, 0.7)', borderRadius: '4px', borderLeft: '3px solid #6366F1' }}>
              <div style={{ fontSize: '10px', color: '#A5B4FC', fontWeight: 600, textTransform: 'uppercase' }}>
                Technical: {term.technicalTerm}
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                {term.technicalDetails}
              </div>
            </div>
          )}
        </div>
      )}
    </span>
  );
};

export const FriendlyStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const { label, tone, explanation } = getFriendlyStatus(status);
  
  const toneStyles = {
    success: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', border: 'rgba(16, 185, 129, 0.4)' },
    warning: { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.4)' },
    danger:  { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', border: 'rgba(239, 68, 68, 0.4)' },
    neutral: { bg: 'rgba(148, 163, 184, 0.15)', text: '#94A3B8', border: 'rgba(148, 163, 184, 0.3)' },
  }[tone];

  return (
    <span
      title={explanation}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 8px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: 600,
        background: toneStyles.bg,
        color: toneStyles.text,
        border: `1px solid ${toneStyles.border}`,
      }}
    >
      <span style={{ fontSize: '7px' }}>●</span>
      {label}
    </span>
  );
};

export const ProvenanceBadge: React.FC<{ provenance: string }> = ({ provenance }) => {
  const provUpper = (provenance || 'ESTIMATED').toUpperCase();
  
  const configs: Record<string, { label: string; bg: string; color: string; desc: string }> = {
    PROVIDER_DERIVED: {
      label: 'PROVIDER DATA',
      bg: 'rgba(16, 185, 129, 0.15)',
      color: '#10B981',
      desc: 'Obtained directly from live Razorpay API responses or verified webhooks.',
    },
    REVIVEAI_DERIVED: {
      label: 'REVIVEOS CALCULATION',
      bg: 'rgba(99, 102, 241, 0.15)',
      color: '#A5B4FC',
      desc: 'Deterministic mathematical calculation derived from real provider inputs.',
    },
    ESTIMATED: {
      label: 'ESTIMATE',
      bg: 'rgba(245, 158, 11, 0.15)',
      color: '#F59E0B',
      desc: 'Projected expectation based on historical recovery curves and priors.',
    },
    SIMULATION: {
      label: 'SIMULATION',
      bg: 'rgba(148, 163, 184, 0.15)',
      color: '#94A3B8',
      desc: 'Synthetic benchmark dataset used for demonstration and stress testing.',
    },
    DEMO: {
      label: 'DEMO FIXTURE',
      bg: 'rgba(236, 72, 153, 0.15)',
      color: '#F472B6',
      desc: 'Curated scenario illustrating edge case arbitration and safety.',
    },
  };

  const current = configs[provUpper] || configs.ESTIMATED;

  return (
    <span
      title={current.desc}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 6px',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        background: current.bg,
        color: current.color,
      }}
    >
      {current.label}
    </span>
  );
};
