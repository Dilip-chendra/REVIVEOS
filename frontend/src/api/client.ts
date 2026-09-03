/**
 * ReviveOS 2.5 — API Client & Global Financial Safety Control Plane
 * The Revenue Recovery & Customer Protection Operating System
 */
import axios from 'axios';

// ── API Base URL Configuration ──────────────────────────────────────────────
// VITE_API_URL is set to:
//   Local Dev:  http://localhost:8000  (via .env.development; Vite proxy also handles /api)
//   Production: https://reviveai-e858.onrender.com  (via .env.production / Vercel env var)
//
// In production builds we strip any trailing slash for safety.
// If VITE_API_URL is missing on a production build, we throw immediately so
// the issue is discovered at startup rather than silently failing at runtime.
const _rawApiUrl = import.meta.env.VITE_API_URL as string | undefined;

let _apiBaseUrl: string;
if (_rawApiUrl) {
  // Strip trailing slash so we never produce double-slash URLs like .../api//opportunities
  _apiBaseUrl = _rawApiUrl.replace(/\/+$/, '');
} else if (import.meta.env.DEV) {
  // Local dev without .env.development — fall back to empty string so Vite proxy handles /api/*
  _apiBaseUrl = '';
} else {
  // Production build with no VITE_API_URL — fail loudly
  throw new Error(
    '[ReviveOS] VITE_API_URL is not set. Set it to https://reviveai-e858.onrender.com ' +
    'in Vercel dashboard under Project → Settings → Environment Variables.'
  );
}

export const API_BASE_URL = _apiBaseUrl;

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  try {
    const appMode = localStorage.getItem('revive_app_mode');
    const isDemo = appMode ? appMode === 'demo' : localStorage.getItem('revive_demo_mode') === 'true';
    config.headers = config.headers ?? {};

    if (isDemo) {
      // Explicit Demo Universe evaluation
      config.headers['Authorization'] = 'Bearer demo_evaluation_token';
      config.headers['X-Revive-Mode'] = 'DEMO';
      config.headers['X-Revive-Environment'] = 'DEMO';
    } else {
      // Strict Real Mode
      const clerk = (window as any).Clerk;
      if (clerk?.session) {
        const token = await clerk.session.getToken();
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
      }
      const env = localStorage.getItem('reviveai_active_environment') || 'RAZORPAY_TEST';
      config.headers['X-Revive-Environment'] = env;
      config.headers['X-Revive-Mode'] = 'REAL';
    }
  } catch (_) {}
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.warn('ReviveAI: session expired, please sign in again.');
    }
    return Promise.reject(error);
  }
);

// ── Helper: normalize array responses ──────────────────────────────────────────
export const asArray = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.cases)) return data.cases;
  return [];
};

// ── Global Safety Controls & Customer Protection ──────────────────────────────
export const getSafetyControlsSummary = () => api.get('/recovery/safety-controls/summary').then(r => r.data);
export const getSafetyGovernorStatus  = () => api.get('/recovery/safety-controls/governor').then(r => r.data);
export const getConstitutionStatus    = () => api.get('/recovery/safety-controls/constitution').then(r => r.data);
export const toggleGlobalKillSwitch   = (enabled: boolean) => api.post('/recovery/safety-controls/kill-switch', { enabled }).then(r => r.data);
export const updateIncidentMode       = (mode: string) => api.post('/recovery/safety-controls/incident-mode', { mode }).then(r => r.data);
export const toggleShadowMode         = (enabled: boolean) => api.post('/recovery/safety-controls/shadow-mode', { enabled }).then(r => r.data);
export const customerCancelRecovery   = (caseId: string) => api.post(`/recovery/${caseId}/customer-cancel`).then(r => r.data);
export const getRecoveryBrainDecision = (caseId: string) => api.get(`/recovery/brain/${caseId}`).then(r => r.data);
export const compareStrategiesInLab   = (payload: any) => api.post('/recovery/strategy-lab/compare', payload).then(r => r.data);

// ── Dashboard & Monetization Command Center ───────────────────────────────────
export const getDashboardMetrics        = () => api.get('/dashboard/metrics').then(r => r.data);
export const getDashboardFunnel         = () => api.get('/dashboard/funnel').then(r => r.data);
export const getGatewayHealth           = () => api.get('/dashboard/gateway-health').then(r => asArray(r.data));
export const getGatewayIntelligence     = () => api.get('/dashboard/gateway-intelligence').then(r => r.data);
export const getCategoryBreakdown       = () => api.get('/dashboard/category-breakdown').then(r => asArray(r.data));
export const getRevenueLeakageMap       = () => api.get('/dashboard/leakage-map').then(r => r.data);
export const getOpportunityQueue        = () => api.get('/dashboard/opportunity-queue').then(r => asArray(r.data));
export const getFinancialProvenance     = () => api.get('/dashboard/provenance').then(r => r.data);

// ── Counterfactual Recovery Lab ───────────────────────────────────────────────
export const getCounterfactualCase = (caseId: string, policyCeiling = 500000) =>
  api.get(`/counterfactuals/case/${caseId}`, { params: { policy_ceiling_inr: policyCeiling } }).then(r => r.data);

export const evaluateCounterfactuals = (body: {
  amount_inr: number;
  failure_code: string;
  failure_category?: string;
  customer_tenure_months?: number;
  historical_success_rate?: number;
  retry_count?: number;
  gateway?: string;
  gateway_is_degraded?: boolean;
  gateway_error_rate?: number;
  is_weekend?: boolean;
  customer_opted_out?: boolean;
  policy_ceiling_inr?: number;
}) => api.post('/counterfactuals/evaluate', body).then(r => r.data);

// ── Policy Studio & Governance ────────────────────────────────────────────────
export const getPolicies         = () => api.get('/policies').then(r => asArray(r.data));
export const getActivePolicy     = () => api.get('/policies/active').then(r => r.data);
export const createPolicyVersion = (body: any) => api.post('/policies', body).then(r => r.data);
export const simulatePolicy      = (body: {
  max_automated_amount_inr?: number;
  max_retries_per_case?: number;
  high_risk_threshold?: number;
  allowed_gateways?: string[];
}) => api.post('/policies/simulate', body).then(r => r.data);

// ── Orchestrator, Action Graph & Replay ───────────────────────────────────────
export const getActionGraph      = (caseId: string) => api.get(`/orchestrator/case/${caseId}/action-graph`).then(r => r.data);
export const rewindCase          = (caseId: string) => api.post(`/orchestrator/case/${caseId}/rewind`).then(r => r.data);
export const getDecisionReceipt  = (caseId: string) => api.get(`/orchestrator/case/${caseId}/receipt`).then(r => r.data);

// ── Experiments & Strategy Backtesting ────────────────────────────────────────
export const runABExperiment     = (cohortSize = 500, seed = 42) =>
  api.post('/experiments/ab-test', { cohort_size: cohortSize, seed }).then(r => r.data);
export const getCalibrationCurve = () => api.get('/experiments/calibration').then(r => r.data);
export const getPerformanceMatrix= () => api.get('/experiments/matrix').then(r => asArray(r.data));

// ── Gateway Incident Commander ────────────────────────────────────────────────
export const getIncidents        = () => api.get('/incidents').then(r => asArray(r.data));
export const triggerCanary       = (canaryPercentage = 15) =>
  api.post('/incidents/canary', { canary_percentage: canaryPercentage }).then(r => r.data);
export const resolveIncident     = () => api.post('/incidents/resolve').then(r => r.data);
export const simulateLiveTraffic = (body: {
  requests_count?: number;
  payu_error_rate?: number;
  razorpay_error_rate?: number;
  cashfree_error_rate?: number;
}) => api.post('/incidents/traffic/simulate', body).then(r => r.data);

// ── Chaos & Red Team Security Lab ─────────────────────────────────────────────
export const getChaosDrills      = () => api.get('/chaos/drills').then(r => r.data);
export const runChaosDrill       = (drillId: string) => api.post(`/chaos/run-drill/${drillId}`).then(r => r.data);
export const getResilienceReport = () => api.get('/chaos/resilience-report').then(r => r.data);

// ── Judge Mode & Scenario Builder ─────────────────────────────────────────────
export const getJudgePresets     = () => api.get('/judge/presets').then(r => asArray(r.data));
export const executeJudgeScenario= (body: any) => api.post('/judge/scenario', body).then(r => r.data);
export const toggleAIService     = (online: boolean) => api.post('/judge/toggle-ai', null, { params: { online } }).then(r => r.data);

// ── AI Copilot ────────────────────────────────────────────────────────────────
export const copilotChat         = (query: string) => api.post('/ai/chat', { query }).then(r => r.data);
export const getAICopilotStatus  = () => api.get('/ai/status').then(r => r.data);

// ── Recovery & Cases ──────────────────────────────────────────────────────────
export const getRecoveryOpportunities = (limit = 50) =>
  api.get('/recovery/opportunities').then(r => asArray(r.data).slice(0, limit));
export const getRiskCases        = (page = 1, perPage = 20) =>
  api.get('/simulation/cases', { params: { page, per_page: perPage } }).then(r => asArray(r.data));
export const getCaseDetail       = (id: string) => api.get(`/recovery/${id}`).then(r => r.data);
export const executeRecovery     = (id: string) => api.post(`/recovery/${id}/execute`).then(r => r.data);
export const getDemoScenarios    = () => api.get('/simulation/demo/scenarios').then(r => asArray(r.data));
export const getFailureTaxonomy  = () => api.get('/simulation/taxonomy').then(r => r.data);

// ── Human Review Queue ────────────────────────────────────────────────────────
export const getHumanQueue       = () => api.get('/recovery/human-queue').then(r => asArray(r.data));
export const approveCase         = (id: string, note = '') => api.post(`/recovery/${id}/approve`, { note }).then(r => r.data);
export const rejectCase          = (id: string, note = '') => api.post(`/recovery/${id}/reject`, { note }).then(r => r.data);

// ── Simulation & Reset ────────────────────────────────────────────────────────
export const runSimulation       = (scale: number, useRazorpay: boolean) =>
  api.post('/simulation/run', { scale, use_razorpay: useRazorpay }).then(r => r.data);
export const resetDemo           = () => api.post('/simulation/demo/reset').then(r => r.data);
export const simulateCustomWebhook = (body: any) => api.post('/simulation/webhook-simulate', body).then(r => r.data);

// ── Audit & Security ──────────────────────────────────────────────────────────
export const getAuditEvents      = () => api.get('/audit/events').then(r => asArray(r.data));
export const verifyAuditChain    = () => api.post('/audit/verify').then(r => r.data);
export const runSecurityChecks   = () => api.get('/security/run-checks').then(r => asArray(r.data));

// ── Evaluation & Impact ───────────────────────────────────────────────────────
export const getEvaluationMetrics= () => api.get('/evaluation/metrics').then(r => r.data);
export const runCounterfactual   = (scale = 1000, seed = 42) => api.post('/impact/run', null, { params: { scale, seed } }).then(r => r.data);
export const getLatestImpact     = () => api.get('/impact/latest').then(r => r.data);
export const getImpactSummary    = () => api.get('/impact/summary').then(r => r.data);
export const getImpactCases      = () => api.get('/impact/cases').then(r => asArray(r.data));

// ── Razorpay Provider Connector & Adaptive Data ──────────────────────────────
export const connectRazorpay        = (body: { api_key?: string; secret?: string; key_id?: string; key_secret?: string; webhook_secret?: string; environment?: string }) =>
  api.post('/razorpay/connect', body).then(r => r.data);
export const testRazorpayConnection = () => api.post('/razorpay/test-connection').then(r => r.data);
export const previewRazorpaySync    = (count = 100) => api.post('/razorpay/preview-sync', null, { params: { count } }).then(r => r.data);
export const syncRazorpayNow        = (maxRecords = 200) => api.post('/razorpay/sync', null, { params: { max_records: maxRecords } }).then(r => r.data);
export const getRazorpaySyncHistory = () => api.get('/razorpay/sync-history').then(r => r.data);
export const getRazorpaySyncStatus  = () => api.get('/razorpay/sync-status').then(r => r.data);
export const getRazorpayHealth      = () => api.get('/razorpay/health').then(r => r.data);
export const runRazorpayIntegrationTest = () => api.post('/razorpay/integration-test').then(r => r.data);
export const getRazorpayRawRecords  = (count = 50) => api.get('/razorpay/raw-records', { params: { count } }).then(r => r.data);
export const createCaseFromPayment  = (paymentId: string) => api.post('/razorpay/create-case', { payment_id: paymentId }).then(r => r.data);
export const reconcileRazorpayState = () => api.post('/razorpay/reconcile').then(r => r.data);
export const switchEnvironment      = (environment: 'DEMO' | 'RAZORPAY_TEST' | 'RAZORPAY_LIVE') =>
  api.post('/razorpay/environment', { environment }).then(r => r.data);
export const setRazorpayEnvironment = switchEnvironment;
export const getRazorpayStatus      = () => api.get('/razorpay/status').then(r => r.data);
export const disconnectRazorpay     = () => api.post('/razorpay/disconnect').then(r => r.data);
export const createRazorpayPaymentLink = (body: { amount_inr: number; description?: string; customer_name?: string; customer_email?: string; customer_contact?: string; notes?: any }) =>
  api.post('/razorpay/payment-link/create', body).then(r => r.data);
export const getRazorpayPaymentLinkStatus = (linkId: string) =>
  api.get(`/razorpay/payment-link/${linkId}`).then(r => r.data);

// ── Recovery Capital Portfolio & Allocator ────────────────────────────────────
export const getCurrentPortfolio = () => api.get('/portfolio/current').then(r => r.data);
export const optimizePortfolio = (body: { recovery_budget_inr: number; contact_limit: number; reserve_budget_pct?: number; risk_budget_inr?: number }) =>
  api.post('/portfolio/optimize', body).then(r => r.data);
export const triggerSettlement = (body?: { recovery_budget_inr: number; contact_limit: number }) =>
  api.post('/portfolio/settle', body || {}).then(r => r.data);
export const getDecisionRegret = () => api.get('/portfolio/regret').then(r => r.data);
export const executePortfolioBatch = (body?: { opportunity_ids?: string[]; max_execute_count?: number }) =>
  api.post('/portfolio/execute-batch', body || {}).then(r => r.data);
export const triggerNewCheckout = (body?: { customer_id?: string; customer_name?: string; amount_inr?: number; order_id?: string }) =>
  api.post('/portfolio/trigger-new-checkout', body || {}).then(r => r.data);
export const cancelOpportunity = (opportunity_id: string) =>
  api.post('/portfolio/cancel-opportunity', { opportunity_id }).then(r => r.data);
export const arbitrateAgents = (body?: { customer_id?: string; customer_name?: string }) =>
  api.post('/portfolio/arbitrate-agents', body || {}).then(r => r.data);
export const getAttentionLedger = () => api.get('/portfolio/attention-ledger').then(r => r.data);
export const getDecisionReplay = (opportunity_id: string, amount_inr?: number, scenario?: string) =>
  api.get(`/portfolio/replay/${opportunity_id}`, { params: { amount_inr, scenario } }).then(r => r.data);
export const simulatePolicyImpact = (body?: { recovery_budget_inr?: number; contact_limit?: number; reserve_budget_pct?: number; max_automated_amount_inr?: number }) =>
  api.post('/portfolio/simulate-policy', body || {}).then(r => r.data);
export const generateRecoveryLink = (opportunity_id: string) =>
  api.post('/portfolio/generate-recovery-link', { opportunity_id }).then(r => r.data);
export const reconcilePayment = (opportunity_id: string, provider_payment_id?: string) =>
  api.post('/portfolio/reconcile-payment', { opportunity_id, provider_payment_id }).then(r => r.data);
export const getRecoveryLedger = () => api.get('/portfolio/recovery-ledger').then(r => r.data);
export const getConversionFunnel = () => api.get('/portfolio/conversion-funnel').then(r => r.data);
export const getAuctionProposals = () => api.get('/portfolio/auction/proposals').then(r => r.data);
export const runRecoveryAuction = (body: { recovery_budget_inr: number; contact_limit: number; reserve_budget_pct?: number }) =>
  api.post('/portfolio/auction/run', body).then(r => r.data);
export const getAuctionCounterfactual = (customer_id: string) =>
  api.get(`/portfolio/auction/counterfactual/${customer_id}`).then(r => r.data);
// ── Economic Brain APIs ───────────────────────────────────────────────────
export const getRecoveryForecast = () => api.get('/dashboard/recovery-forecast').then(r => r.data);
export const getRecoveryInventory = () => api.get('/dashboard/recovery-inventory').then(r => r.data);
export const getOpportunityGraph = () => api.get('/dashboard/opportunity-graph').then(r => r.data);
export const getDecisionQuality = () => api.get('/portfolio/decision-quality').then(r => r.data);
export const recordDecisionOutcome = (body: { opportunity_id: string; decision_made: string; outcome_observed: string; tau_at_decision?: number; p_natural_at_decision?: number; amount_inr?: number; intervention_cost_inr?: number }) =>
  api.post('/portfolio/record-outcome', body).then(r => r.data);
export const getAgentCompetition = (customerId: string) => api.get(`/portfolio/agent-competition/${customerId}`).then(r => r.data);
export const getOpportunityPlans = (opportunityId: string, amountInr = 5000, failureCode = 'CARD_EXPIRED', isPreAuth = false) =>
  api.get(`/portfolio/opportunity-plans/${opportunityId}`, { params: { amount_inr: amountInr, failure_code: failureCode, is_pre_authorized: isPreAuth } }).then(r => r.data);
export const getHalfLifeDecay = (opportunityId: string, opportunityType = 'abandoned_cart', createdAt?: string) =>
  api.get(`/portfolio/half-life/${opportunityId}`, { params: { opportunity_type: opportunityType, created_at: createdAt } }).then(r => r.data);
export const compilePolicyNL = (body: { natural_language_instruction: string; run_simulation?: boolean }) =>
  api.post('/policies/compile', body).then(r => r.data);
export const simulatePolicyWhatIf = (body: { change_description?: string; new_max_automated_amount_inr?: number; new_daily_automation_budget_inr?: number; new_high_risk_threshold?: number; new_max_retries_per_case?: number }) =>
  api.post('/policies/what-if', body).then(r => r.data);
export const getFailureClusters = () => api.get('/incidents/clusters').then(r => r.data);
export const getJudgeMegaScenario = () => api.get('/judge/mega-scenario').then(r => r.data);

// ── Agent Interoperability & Governance Gateway ──────────────────────────────
export const listAgents = () => api.get('/agents').then(r => r.data);
export const registerAgent = (body: { agent_name: string; agent_type: string; integration_type: string; capabilities: string[]; description?: string; callback_url?: string }) =>
  api.post('/agents/register', body).then(r => r.data);
export const getAgentDetails = (agentId: string) => api.get(`/agents/${agentId}`).then(r => r.data);
export const submitAgentProposal = (body: any, headers?: Record<string, string>) =>
  api.post('/agents/proposals', body, { headers }).then(r => r.data);
export const getProposalDecision = (proposalId: string) => api.get(`/agents/decisions/${proposalId}`).then(r => r.data);
export const getAgentTimeline = (limit = 50) => api.get('/agents/telemetry/timeline', { params: { limit } }).then(r => r.data);
export const simulateAgentCollisionLive = () => api.post('/agents/simulate-collision').then(r => r.data);
export const simulateAgentBypassLive = () => api.post('/agents/simulate-bypass').then(r => r.data);
export const getMcpManifest = () => api.get('/agents/mcp/manifest').then(r => r.data);
export const callMcpTool = (body: { tool_name: string; arguments: Record<string, any> }) =>
  api.post('/agents/mcp/tools', body).then(r => r.data);


// ── Onboarding & Merchant ─────────────────────────────────────────────────────
export const getOnboardingStatus = () => api.get('/onboarding/status').then(r => r.data);
export const completeOnboarding  = (body: any) => api.post('/onboarding/complete', body).then(r => r.data);
export const getMyMerchant       = () => api.get('/merchant/me').then(r => r.data);
export const updateMyMerchant    = (body: Record<string, string>) => api.patch('/merchant/me', body).then(r => r.data);
export const getControlsConfig   = () => api.get('/controls/config').then(r => r.data);
export const getSystemHealth     = () => api.get('/health').then(r => r.data);