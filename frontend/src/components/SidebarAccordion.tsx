import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, AlertTriangle, GitCompare, HelpCircle, Activity, Bot,
  Shield, ShieldCheck, Network, ShieldAlert, TrendingUp, FlaskConical,
  Calculator, History, Briefcase, Scale, Zap, Code2, ChevronRight,
  Sparkles, Terminal, FileText, Users, Brain, MessageSquare, Clock, CreditCard
} from 'lucide-react';

export interface SubNavItem {
  label: string;
  to: string;
  icon?: React.ComponentType<any>;
}

export interface NavCategory {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  items: SubNavItem[];
}

export const NAVIGATION_CATEGORIES: NavCategory[] = [
  {
    id: 'command-center',
    label: 'PORTFOLIO ALLOCATOR',
    icon: LayoutDashboard,
    items: [
      { to: '/', label: 'Recovery Capital Desk', icon: LayoutDashboard },
      { to: '/opportunities', label: 'Recovery Opportunity Queue', icon: Zap },
      { to: '/communications', label: 'Omnichannel Communications', icon: MessageSquare },
      { to: '/automation', label: 'Autonomy Control Center', icon: Clock },
      { to: '/risk', label: 'Opportunity Portfolio', icon: AlertTriangle },
      { to: '/customers', label: 'Customer Intelligence', icon: Users },
    ],
  },
  {
    id: 'intelligence',
    label: 'INTELLIGENCE & CAUSALITY',
    icon: Sparkles,
    items: [
      { to: '/insights', label: 'AI Revenue Insights', icon: Brain },
      { to: '/counterfactual-lab', label: 'Incrementality Lab (τ)', icon: GitCompare },
      { to: '/failure-intelligence', label: 'Failure Intelligence', icon: HelpCircle },
      { to: '/gateway-intelligence', label: 'Gateway Telemetry', icon: Activity },
      { to: '/copilot', label: 'Revenue Copilot', icon: Bot },
    ],
  },
  {
    id: 'control-governance',
    label: 'CONTROL & GOVERNANCE',
    icon: ShieldCheck,
    items: [
      { to: '/collision-lab', label: 'Agent Collision Lab', icon: Bot },
      { to: '/toctou', label: 'TOCTOU Simulator', icon: ShieldCheck },
      { to: '/recovery-arena', label: 'Recovery Arena', icon: Scale },
      { to: '/policy-studio', label: 'Policy Studio', icon: Shield },
      { to: '/human-review', label: 'Needs Attention', icon: ShieldCheck },
      { to: '/gateway-commander', label: 'Incident Commander', icon: Network },
      { to: '/chaos-lab', label: 'Chaos & Red Team', icon: ShieldAlert },
    ],
  },
  {
    id: 'measure-lift',
    label: 'INCREMENTAL YIELD & REGRET',
    icon: TrendingUp,
    items: [
      { to: '/recovery-experiments', label: 'Recovery Experiment Lab', icon: FlaskConical },
      { to: '/impact', label: 'Incremental Recovery Yield', icon: TrendingUp },
      { to: '/experiments', label: 'Holdout A/B Experiments', icon: FlaskConical },
      { to: '/calculator', label: 'ROI & Pricing Model', icon: Calculator },
      { to: '/payouts', label: 'Governed Payouts', icon: CreditCard },
      { to: '/evaluation', label: 'Attribution & Regret Engine', icon: FlaskConical },
    ],
  },
  {
    id: 'proof-audit',
    label: 'PROOF & AUDIT',
    icon: FileText,
    items: [
      { to: '/audit', label: 'Activity & Audit', icon: History },
      { to: '/recruiter-audit', label: 'Staff Engineering', icon: Briefcase },
    ],
  },
  {
    id: 'developer-sandbox',
    label: 'DEVELOPER & SANDBOX',
    icon: Terminal,
    items: [
      { to: '/judge-mode', label: 'Judge & Test Console', icon: Scale },
      { to: '/webhook-studio', label: 'Webhook Studio', icon: Zap },
      { to: '/integrations', label: 'Developer Hub', icon: Code2 },
    ],
  },
];

interface SidebarAccordionProps {
  onNavigate?: () => void;
}

export const SidebarAccordion: React.FC<SidebarAccordionProps> = ({ onNavigate }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  // Determine active category based on current pathname
  const activeCategoryId = useMemo(() => {
    for (const category of NAVIGATION_CATEGORIES) {
      if (category.items.some(item => {
        if (item.to === '/') return currentPath === '/';
        return currentPath === item.to || currentPath.startsWith(item.to + '/');
      })) {
        return category.id;
      }
    }
    // Handle specific nested routes
    if (currentPath.startsWith('/case/')) return 'command-center';
    if (currentPath.startsWith('/customers')) return 'command-center';
    return null;
  }, [currentPath]);

  // State: open category ID (single open accordion by default)
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(() => {
    return activeCategoryId || 'command-center';
  });

  // Auto-expand category when navigating to a route inside a collapsed section
  useEffect(() => {
    if (activeCategoryId && activeCategoryId !== openCategoryId) {
      setOpenCategoryId(activeCategoryId);
    }
  }, [activeCategoryId]);

  const handleToggle = (categoryId: string) => {
    setOpenCategoryId(prev => (prev === categoryId ? null : categoryId));
  };

  return (
    <nav className="sidebar-nav-scroll" aria-label="Main Navigation">
      {NAVIGATION_CATEGORIES.map((category) => {
        const CategoryIcon = category.icon;
        const isOpen = openCategoryId === category.id;
        const hasActiveChild = activeCategoryId === category.id;

        return (
          <div
            key={category.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '10px',
              transition: 'background 0.15s ease',
            }}
          >
            {/* ── Category Header Button ── */}
            <button
              type='button'
              onClick={() => handleToggle(category.id)}
              aria-expanded={isOpen}
              aria-controls={'accordion-panel-' + category.id}
              id={'accordion-header-' + category.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '8px 10px',
                background: isOpen
                  ? 'rgba(255, 255, 255, 0.04)'
                  : hasActiveChild
                  ? 'rgba(59, 130, 246, 0.05)'
                  : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: hasActiveChild ? '#F8FAFC' : isOpen ? '#E2E8F0' : '#94A3B8',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '0.6875rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                transition: 'all 0.15s ease',
                userSelect: 'none',
              }}
              onMouseEnter={(e) => {
                if (!isOpen) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  e.currentTarget.style.color = '#F1F5F9';
                }
              }}
              onMouseLeave={(e) => {
                if (!isOpen) {
                  e.currentTarget.style.background = hasActiveChild ? 'rgba(59, 130, 246, 0.05)' : 'transparent';
                  e.currentTarget.style.color = hasActiveChild ? '#F8FAFC' : '#94A3B8';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '18px',
                    height: '18px',
                    borderRadius: '4px',
                    background: hasActiveChild
                      ? 'rgba(59, 130, 246, 0.2)'
                      : isOpen
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'transparent',
                    color: hasActiveChild ? '#60A5FA' : '#94A3B8',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <CategoryIcon size={13} strokeWidth={2.2} />
                </div>
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: 1,
                  }}
                >
                  {category.label}
                </span>
              </div>

              {/* Animated Chevron Indicator */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isOpen ? '#60A5FA' : '#64748B',
                  flexShrink: 0,
                  transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <ChevronRight size={13} strokeWidth={2.5} />
              </div>
            </button>

            {/* ── Submenu Panel in Natural Document Flow ── */}
            {isOpen && (
              <div
                id={'accordion-panel-' + category.id}
                role='region'
                aria-labelledby={'accordion-header-' + category.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  padding: '4px 0 6px 6px',
                  position: 'relative',
                }}
              >
                {/* Subtle hierarchy guide line */}
                <div
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '6px',
                    bottom: '8px',
                    width: '1px',
                    background: 'rgba(255, 255, 255, 0.07)',
                  }}
                />

                {category.items.map((item) => {
                  const SubIcon = item.icon;
                  const isItemActive = item.to === '/'
                    ? currentPath === '/'
                    : currentPath === item.to || currentPath.startsWith(item.to + '/');

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      onClick={() => {
                        if (onNavigate) onNavigate();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 8px 6px 12px',
                        marginLeft: '0px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: isItemActive ? 600 : 500,
                        color: isItemActive ? '#FFFFFF' : '#94A3B8',
                        background: isItemActive
                          ? 'linear-gradient(90deg, rgba(59, 130, 246, 0.16) 0%, rgba(59, 130, 246, 0.04) 100%)'
                          : 'transparent',
                        borderLeft: isItemActive
                          ? '2px solid #3B82F6'
                          : '2px solid transparent',
                        textDecoration: 'none',
                        transition: 'all 0.15s ease',
                        position: 'relative',
                        minWidth: 0,
                      }}
                      onMouseEnter={(e) => {
                        if (!isItemActive) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                          e.currentTarget.style.color = '#F1F5F9';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isItemActive) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = '#94A3B8';
                        }
                      }}
                    >
                      {SubIcon && (
                        <SubIcon
                          size={14}
                          strokeWidth={isItemActive ? 2.2 : 1.8}
                          style={{
                            color: isItemActive ? '#60A5FA' : '#64748B',
                            flexShrink: 0,
                            transition: 'color 0.15s ease',
                          }}
                        />
                      )}
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          letterSpacing: '-0.005em',
                        }}
                      >
                        {item.label}
                      </span>
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
};
