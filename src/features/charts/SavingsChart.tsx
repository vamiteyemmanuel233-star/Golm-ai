import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCedi, formatCediCompact, toCedis } from '../../lib/money';
import { useSettings } from '../../state/SettingsContext';
import { chartTheme, tooltipStyle } from './chartTheme';

/** Cumulative savings over the simulation period. */
export default function SavingsChart({ series, height = 260 }: { series: { month: number; cumulative: number }[]; height?: number }) {
  const { theme } = useSettings();
  const c = chartTheme(theme);
  const rows = series.map((p) => ({ label: `M${p.month}`, saved: toCedis(p.cumulative) }));
  return (
    <div className="chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={c.grid} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: c.axis, fontSize: 12 }} interval="preserveStartEnd" />
          <YAxis tickLine={false} axisLine={false} width={64} tick={{ fill: c.axis, fontSize: 12 }} tickFormatter={(v: number) => formatCediCompact(v * 100)} />
          <Tooltip {...tooltipStyle(theme)} formatter={(value: unknown) => [formatCedi(Math.round(Number(value) * 100)), 'Saved so far']} />
          <Line type="monotone" dataKey="saved" stroke={c.income} strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
