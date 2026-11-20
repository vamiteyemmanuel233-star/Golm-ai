import { useMemo, useState } from 'react';
import { Activity, Tag, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { ProgressBar } from '../../components/ProgressBar';
import { StatCard } from '../../components/StatCard';
import { addMonths, lastNMonths, monthLabel } from '../../lib/dates';
import { budgetUtilization, categoryBreakdown, methodBreakdown, monthlyTotals } from '../../lib/finance';
import { paymentMethodLabel } from '../../lib/paymentMethods';
import { forecastHistoryEnd, forecastNextMonth } from '../../lib/forecast';
import { formatCedi, formatPercent, toCedis } from '../../lib/money';
import { useFinance } from '../../state/FinanceContext';
import { LazyCashflowChart, LazyCategoryDonut, LazyTrendChart } from '../charts/LazyCharts';
import type { TrendPoint } from '../charts/TrendChart';
import { useMonthMeta } from '../layout/MonthPicker';
import { CategoryDot } from '../shared';

export function AnalyticsView() {
  const { data, today } = useFinance();
  const { month, label } = useMonthMeta();
  const [range, setRange] = useState<6 | 12>(6);

  const view = useMemo(() => {
    const months = lastNMonths(month, range);
    const totals = monthlyTotals(data.transactions, months);
    const tracked = totals.filter((m) => m.income > 0 || m.expenses > 0);
    const avgIncome = tracked.length ? tracked.reduce((s, m) => s + m.income, 0) / tracked.length : 0;
    const avgExpenses = tracked.length ? tracked.reduce((s, m) => s + m.expenses, 0) / tracked.length : 0;
    const rangeIncome = totals.reduce((s, m) => s + m.income, 0);
    const rangeNet = totals.reduce((s, m) => s + m.net, 0);
    const categories = categoryBreakdown(data.transactions, 'expense', month);
    const budgets = budgetUtilization(data.transactions, data.budgets, month);
    const methods = methodBreakdown(data.transactions, 'expense', month);

    const historyEnd = forecastHistoryEnd(month, today);
    const forecast = forecastNextMonth(monthlyTotals(data.transactions, lastNMonths(historyEnd, 6)));
    const trend: TrendPoint[] = totals.map((m) => ({ label: monthLabel(m.month), spending: toCedis(m.expenses), forecast: null }));
    if (forecast) {
      const last = trend[trend.length - 1];
      if (last) last.forecast = last.spending;
      trend.push({ label: `${monthLabel(addMonths(month, 1))} (est.)`, spending: null, forecast: toCedis(forecast.value) });
    }
    return { totals, tracked, avgIncome, avgExpenses, rangeIncome, rangeNet, categories, budgets, methods, trend, forecast };
  }, [data, month, range, today]);

  if (data.transactions.length === 0) {
    return (
      <>
        <PageHeader title="Analytics" />
        <Card>
          <EmptyState icon={Activity} title="Nothing to analyse yet" message="Charts appear once you have recorded some transactions." />
        </Card>
      </>
    );
  }

  const rangeRate = view.rangeIncome > 0 ? view.rangeNet / view.rangeIncome : null;
  const top = view.categories[0];

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle={`Trends up to ${label}`}
        actions={
          <div className="segmented segmented--compact" role="group" aria-label="Time range">
            {([6, 12] as const).map((n) => (
              <button key={n} type="button" className={`segmented__option ${range === n ? 'is-active' : ''}`} aria-pressed={range === n} onClick={() => setRange(n)}>
                {n} months
              </button>
            ))}
          </div>
        }
      />

      <div className="stats-grid">
        <StatCard label="Avg. monthly income" value={formatCedi(Math.round(view.avgIncome))} icon={TrendingUp} tone="green" footnote={`Across ${view.tracked.length} tracked month${view.tracked.length === 1 ? '' : 's'}`} />
        <StatCard label="Avg. monthly spending" value={formatCedi(Math.round(view.avgExpenses))} icon={TrendingDown} tone="blue" footnote={`Last ${range} months`} />
        <StatCard label="Savings rate" value={rangeRate === null ? '—' : formatPercent(rangeRate)} icon={Wallet} tone="navy" footnote={`Net ${formatCedi(view.rangeNet)} over ${range} months`} footnoteTone={rangeRate !== null && rangeRate >= 0.1 ? 'good' : 'neutral'} />
        <StatCard label={`Largest category · ${monthLabel(month)}`} value={top ? top.category : '—'} icon={Tag} tone="navy" footnote={top ? `${formatCedi(top.total)} · ${formatPercent(top.share)}` : 'No expenses this month'} />
      </div>

      <Card title="Monthly income and expenses" subtitle={`Last ${range} months`}>
        <LazyCashflowChart data={view.totals} height={300} />
      </Card>

      <div className="grid-2">
        <Card title="Spending by category" subtitle={label}>
          {view.categories.length === 0 ? (
            <p className="muted">No expenses recorded in {label}.</p>
          ) : (
            <div className="donut-layout">
              <LazyCategoryDonut data={view.categories} />
              <ul className="legend-list">
                {view.categories.map((c) => (
                  <li key={c.category}>
                    <span><CategoryDot category={c.category} /> {c.category}</span>
                    <span><strong>{formatCedi(c.total)}</strong> <span className="muted">{formatPercent(c.share)}</span></span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card title="Spending trend" subtitle={view.forecast ? 'Dashed line: next-month statistical forecast' : 'Not enough history for a forecast yet'}>
          <LazyTrendChart data={view.trend} />
          {view.forecast ? (
            <p className="chart-note">
              Forecast {formatCedi(view.forecast.value)} — weighted moving average of {view.forecast.monthsUsed.map((m) => monthLabel(m)).join(', ')}. See Insights for the method.
            </p>
          ) : null}
        </Card>
      </div>

      <div className="grid-2">
      <Card title="How you pay" subtitle={`Spending by payment method · ${label}`}>
        {view.methods.length === 0 ? (
          <p className="muted">No expenses recorded in {label}.</p>
        ) : (
          <ul className="bar-list">
            {view.methods.map((m) => (
              <li key={m.method}>
                <div className="bar-list__row">
                  <span>{m.method === 'unrecorded' ? 'Not recorded' : paymentMethodLabel(m.method)}</span>
                  <strong>{formatCedi(m.total)}</strong>
                </div>
                <div className="bar-list__track" aria-hidden="true">
                  <span style={{ width: `${Math.max(m.share * 100, 2)}%` }} />
                </div>
                <span className="bar-list__share">{formatPercent(m.share)} · {m.count} payment{m.count === 1 ? '' : 's'}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Budget utilisation" subtitle={label}>
        {view.budgets.length === 0 ? (
          <p className="muted">No budgets set. Add some on the Budgets page.</p>
        ) : (
          <ul className="util-list">
            {view.budgets.map((b) => (
              <li key={b.category}>
                <span className="util-list__name"><CategoryDot category={b.category} /> {b.category}</span>
                <ProgressBar ratio={b.ratio} state={b.state} label={`${b.category} budget`} />
                <span className="util-list__value">{formatPercent(b.ratio)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      </div>

      <Card title="Monthly summary table" subtitle="The figures behind the charts">
        <div className="table-wrap">
          <table className="table table--compact">
            <caption className="sr-only">Income, expenses and net per month</caption>
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col" className="num">Income</th>
                <th scope="col" className="num">Expenses</th>
                <th scope="col" className="num">Net</th>
                <th scope="col" className="num">Savings rate</th>
              </tr>
            </thead>
            <tbody>
              {[...view.totals].reverse().map((m) => (
                <tr key={m.month}>
                  <td data-label="Month">{monthLabel(m.month, 'long')}</td>
                  <td data-label="Income" className="num">{formatCedi(m.income)}</td>
                  <td data-label="Expenses" className="num">{formatCedi(m.expenses)}</td>
                  <td data-label="Net" className={`num ${m.net < 0 ? 'text-danger' : ''}`}>{formatCedi(m.net)}</td>
                  <td data-label="Savings rate" className="num">{m.income > 0 ? formatPercent(m.net / m.income) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
