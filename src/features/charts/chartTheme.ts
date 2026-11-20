import type { Theme } from '../../types/finance';

/** Recharts draws SVG attributes, so colours are given as values, not CSS variables. */
export function chartTheme(theme: Theme) {
  const dark = theme === 'dark';
  return {
    income: dark ? '#34d399' : '#10b981',
    expense: dark ? '#6f93ff' : '#2f5bea',
    net: dark ? '#fbbf24' : '#f59e0b',
    forecast: dark ? '#a5b4fc' : '#6366f1',
    grid: dark ? 'rgba(148,163,184,0.16)' : 'rgba(15,23,42,0.08)',
    axis: dark ? '#94a3b8' : '#64748b',
    tooltipBg: dark ? '#0f1b3a' : '#ffffff',
    tooltipBorder: dark ? '#22325c' : '#e2e8f0',
    text: dark ? '#e2e8f0' : '#0f172a',
  };
}

export function tooltipStyle(theme: Theme) {
  const c = chartTheme(theme);
  return {
    contentStyle: { background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 12, color: c.text, boxShadow: '0 12px 30px rgba(2,6,23,0.18)' },
    labelStyle: { color: c.text, fontWeight: 600 },
    itemStyle: { color: c.text },
  };
}
