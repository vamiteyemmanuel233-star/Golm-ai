import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { CategoryTotal } from '../../lib/finance';
import { categoryColor } from '../../lib/categories';
import { formatCedi, toCedis } from '../../lib/money';
import { useSettings } from '../../state/SettingsContext';
import { tooltipStyle } from './chartTheme';

/** Spending share by category. The accompanying legend list carries the exact numbers. */
export default function CategoryDonut({ data, height = 240 }: { data: CategoryTotal[]; height?: number }) {
  const { theme } = useSettings();
  const rows = data.map((d) => ({ name: d.category, value: toCedis(d.total) }));
  return (
    <div className="chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={rows} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="88%" paddingAngle={2} stroke="none" isAnimationActive>
            {rows.map((row) => (
              <Cell key={row.name} fill={categoryColor(row.name)} />
            ))}
          </Pie>
          <Tooltip {...tooltipStyle(theme)} formatter={(value: unknown) => formatCedi(Math.round(Number(value) * 100))} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
