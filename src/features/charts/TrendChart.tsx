import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCedi, formatCediCompact } from '../../lib/money';
import { useSettings } from '../../state/SettingsContext';
import { chartTheme, tooltipStyle } from './chartTheme';

export interface TrendPoint {
  label: string;
  /** recorded spending in cedis (null for the forecast month) */
  spending: number | null;
  /** forecast line in cedis (set on the last actual month and the forecast month) */
  forecast: number | null;
}

/** Spending over time, with a dashed line to next month's statistical forecast. */
export default function TrendChart({ data, height = 280 }: { data: TrendPoint[]; height?: number }) {
  const { theme } = useSettings();
  const c = chartTheme(theme);
  return (
    <div className="chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={c.grid} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: c.axis, fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} width={64} tick={{ fill: c.axis, fontSize: 12 }} tickFormatter={(v: number) => formatCediCompact(v * 100)} />
          <Tooltip
            {...tooltipStyle(theme)}
            formatter={(value: unknown, name: unknown) => [formatCedi(Math.round(Number(value) * 100)), name === 'forecast' ? 'Forecast (estimate)' : 'Spending']}
          />
          <Line type="monotone" dataKey="spending" stroke={c.expense} strokeWidth={3} dot={{ r: 4, fill: c.expense }} activeDot={{ r: 6 }} connectNulls={false} />
          <Line type="monotone" dataKey="forecast" stroke={c.forecast} strokeWidth={2.5} strokeDasharray="6 6" dot={{ r: 4, fill: c.forecast }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
