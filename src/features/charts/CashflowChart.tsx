import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MonthTotal } from '../../lib/finance';
import { monthLabel } from '../../lib/dates';
import { formatCedi, formatCediCompact, toCedis } from '../../lib/money';
import { useSettings } from '../../state/SettingsContext';
import { chartTheme, tooltipStyle } from './chartTheme';

/** Monthly income vs expenses (grouped bars). */
export default function CashflowChart({ data, height = 280 }: { data: MonthTotal[]; height?: number }) {
  const { theme } = useSettings();
  const c = chartTheme(theme);
  const rows = data.map((m) => ({ label: monthLabel(m.month), Income: toCedis(m.income), Expenses: toCedis(m.expenses) }));

  return (
    <div className="chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
          <CartesianGrid vertical={false} stroke={c.grid} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: c.axis, fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} width={64} tick={{ fill: c.axis, fontSize: 12 }} tickFormatter={(v: number) => formatCediCompact(v * 100)} />
          <Tooltip {...tooltipStyle(theme)} cursor={{ fill: c.grid }} formatter={(value: unknown) => formatCedi(Math.round(Number(value) * 100))} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 13, color: c.axis }} />
          <Bar dataKey="Income" fill={c.income} radius={[6, 6, 0, 0]} maxBarSize={34} />
          <Bar dataKey="Expenses" fill={c.expense} radius={[6, 6, 0, 0]} maxBarSize={34} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
