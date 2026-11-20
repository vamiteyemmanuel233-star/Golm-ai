import { useMemo, useState } from 'react';
import { Activity, BadgeCheck, Calculator, Flag, Info, Lightbulb, ShieldAlert, TriangleAlert } from 'lucide-react';
import { routeHref } from '../../app/routes';
import { ButtonLink } from '../../components/Button';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { addMonths, formatDisplayDate, lastNMonths, monthLabel } from '../../lib/dates';
import { monthlyTotals } from '../../lib/finance';
import { forecastByCategory, forecastHistoryEnd, forecastNextMonth } from '../../lib/forecast';
import { buildRecommendations, detectUnusualExpenses, type Severity } from '../../lib/insights';
import { formatCedi } from '../../lib/money';
import { useFinance } from '../../state/FinanceContext';
import { useMonthMeta } from '../layout/MonthPicker';
import { CategoryDot, SEVERITY_LABEL, SEVERITY_TONE } from '../shared';

const SEVERITY_ICON: Record<Severity, LucideIcon> = { critical: ShieldAlert, warning: TriangleAlert, info: Info, positive: BadgeCheck };

export function InsightsView() {
  const { data, today } = useFinance();
  const { month, label } = useMonthMeta();
  const [scope, setScope] = useState<'month' | 'all'>('month');

  const view = useMemo(() => {
    const unusualMonth = detectUnusualExpenses(data.transactions, { month });
    const unusualAll = detectUnusualExpenses(data.transactions);
    const recs = buildRecommendations({
      transactions: data.transactions,
      budgets: data.budgets,
      month,
      today,
      previousMonths: monthlyTotals(data.transactions, lastNMonths(addMonths(month, -1), 3)),
      unusual: unusualMonth,
    });
    const historyEnd = forecastHistoryEnd(month, today);
    const history = monthlyTotals(data.transactions, lastNMonths(historyEnd, 6));
    const forecast = forecastNextMonth(history);
    const byCategory = forecast ? forecastByCategory(data.transactions, forecast.monthsUsed) : [];
    return { unusualMonth, unusualAll, recs, forecast, byCategory, history };
  }, [data, month, today]);

  if (data.transactions.length === 0) {
    return (
      <>
        <PageHeader title="Insights" />
        <Card>
          <EmptyState icon={Lightbulb} title="No insights yet" message="Insights are calculated from your recorded transactions. Add some to get started." />
        </Card>
      </>
    );
  }

  const unusual = scope === 'month' ? view.unusualMonth : view.unusualAll;
  const f = view.forecast;
  const target = monthLabel(addMonths(month, 1), 'long');

  return (
    <>
      <PageHeader
        title="Smart insights"
        subtitle={`Rule-based analysis of ${label}. Every insight shows the rule behind it.`}
        actions={<ButtonLink href={routeHref('analytics')} icon={Activity} size="sm">Open analytics</ButtonLink>}
      />

      <div className="notice" role="note">
        <Calculator size={18} aria-hidden="true" />
        <p>
          These insights come from <strong>transparent statistical rules and formulas</strong>, not a trained AI model. The optional AI assistant is a separate feature.
        </p>
      </div>

      <Card title="Recommendations" subtitle={label}>
        <ul className="rec-list">
          {view.recs.map((r) => {
            const Icon = SEVERITY_ICON[r.severity];
            return (
              <li key={r.id} className={`rec rec--${r.severity}`}>
                <span className="rec__icon" aria-hidden="true"><Icon size={20} /></span>
                <div className="rec__body">
                  <div className="rec__title">
                    <h3>{r.title}</h3>
                    <Badge tone={SEVERITY_TONE[r.severity]}>{SEVERITY_LABEL[r.severity]}</Badge>
                  </div>
                  <p>{r.detail}</p>
                  <details className="rec__basis">
                    <summary>How was this calculated?</summary>
                    <p>{r.basis}</p>
                  </details>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="grid-2">
        <Card
          title="Unusual expenses"
          subtitle="Far above what is normal for the category"
          action={
            <div className="segmented segmented--compact" role="group" aria-label="Unusual expenses scope">
              <button type="button" className={`segmented__option ${scope === 'month' ? 'is-active' : ''}`} aria-pressed={scope === 'month'} onClick={() => setScope('month')}>{monthLabel(month)}</button>
              <button type="button" className={`segmented__option ${scope === 'all' ? 'is-active' : ''}`} aria-pressed={scope === 'all'} onClick={() => setScope('all')}>All time</button>
            </div>
          }
        >
          {unusual.length === 0 ? (
            <EmptyState icon={BadgeCheck} title="Nothing unusual" message="No expense stands out from your normal pattern. Categories need at least 5 expenses before they are checked." />
          ) : (
            <ul className="unusual-list">
              {unusual.slice(0, 8).map((u) => (
                <li key={u.transaction.id}>
                  <span className="unusual-list__icon" aria-hidden="true"><Flag size={18} /></span>
                  <div>
                    <p className="unusual-list__title">
                      {u.transaction.description || u.transaction.category} <strong>{formatCedi(u.transaction.amount)}</strong>
                    </p>
                    <p className="unusual-list__meta"><CategoryDot category={u.transaction.category} /> {u.transaction.category} · {formatDisplayDate(u.transaction.date)}</p>
                    <p className="unusual-list__reason">{u.reason}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={`Spending forecast · ${target}`} subtitle="Statistical estimate — not a guarantee">
          {!f ? (
            <EmptyState icon={Calculator} title="Not enough history" message="A forecast needs at least one complete month of expenses." />
          ) : (
            <div className="forecast">
              <p className="big-number">{formatCedi(f.value)}</p>
              <p className="muted">
                Range in the months used: {formatCedi(f.low)} – {formatCedi(f.high)}
                {f.trendValue !== null ? ` · Linear-trend projection: ${formatCedi(f.trendValue)}` : ''}
              </p>
              <div className="formula">
                <p className="formula__title">Method: weighted moving average</p>
                <p>
                  {f.monthsUsed.map((m, i) => `${monthLabel(m)} × ${f.weights[i]}`).join(' + ')} ÷ {f.weights.reduce((s, w) => s + w, 0)}
                </p>
                <p className="muted">Newer months carry more weight. Only complete months are used, so a month still in progress does not skew the estimate.</p>
              </div>
              {view.byCategory.length > 0 ? (
                <ul className="simple-list simple-list--tight">
                  {view.byCategory.slice(0, 6).map((c) => (
                    <li key={c.category}>
                      <span><CategoryDot category={c.category} /> {c.category}</span>
                      <strong>{formatCedi(c.value)}</strong>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}
        </Card>
      </div>

      <Card title="How GOLM AI calculates insights">
        <dl className="method-list">
          <div><dt>Budget alerts</dt><dd>Spent ÷ monthly limit. 85% or more is a warning; above 100% is over budget.</dd></div>
          <div><dt>Unusual expenses</dt><dd>Modified z-score = 0.6745 × (amount − median) ÷ median absolute deviation, flagged above 3.5. Robust to the outliers it is looking for.</dd></div>
          <div><dt>Spending trend</dt><dd>This month (projected to month end at the current daily pace if still in progress) compared with the average of the previous 3 months; ±15% is highlighted.</dd></div>
          <div><dt>Forecast</dt><dd>Weighted moving average of up to 3 recent complete months (weights 1, 2, 3), with a least-squares trend line for comparison.</dd></div>
          <div><dt>Savings rate</dt><dd>(Income − expenses) ÷ income for the selected month.</dd></div>
        </dl>
      </Card>
    </>
  );
}
