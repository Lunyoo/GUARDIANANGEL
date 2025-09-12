// Central performance + interval configuration (real implementation replacing mock)
// INTERVALS are used across dashboards to throttle fetches and avoid over-polling the backend.
export const INTERVALS = {
  DASHBOARD_REFRESH: 15_000, // 15s between dashboard refresh attempts
  OPS_POLL: 30_000,
  METRICS_PING: 20_000,
  REALTIME_STALE: 12_000,
};

// Lightweight debug logger gated by localStorage flag or env var injection.
export function debugLog(scope: string, ...args: any[]) {
  try {
    const enabled = (typeof localStorage !== 'undefined' && localStorage.getItem('ga:debug')) || process.env.NODE_ENV === 'development'
    if (!enabled) return
    const ts = new Date().toISOString().split('T')[1].replace('Z','')
    // eslint-disable-next-line no-console
    console.log(`[%cGA%c][${scope}] %c${ts}`,'color:#06b6d4','color:inherit','color:#64748b',...args)
  } catch {}
}
