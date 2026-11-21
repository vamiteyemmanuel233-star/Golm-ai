import { useId, useMemo, useState } from 'react';
import { Info, RotateCcw, Scissors, SlidersHorizontal, Target, TrendingUp, Wallet } from 'lucide-react';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { PageHeader } from '../../components/PageHeader';
import { StatCard } from '../../components/StatCard';
import { FLEXIBLE_CATEGORIES } from '../../lib/coach';
import { currencyLabel } from '../../lib/currency';
import { monthLabel } from '../../lib/dates';
import { planGoal } from '../../lib/goals';
import { formatCedi, pesewasToDecimalString } from '../../lib/money';
import { buildBaseline, goalImpact, simulate } from '../../lib/simulator';
import { useFinance } from '../../state/FinanceContext';
import { LazySavingsChart } from '../charts/LazyCharts';
import { CategoryDot } from '../shared';

interface RowState {
  category: string;
  flexible: boolean;
  amount: string; // in main currency units, as typed
  percent: number;
}

const HORIZONS = [3, 6, 12, 24, 36];

function toPesewas(text: string): number {
  const n = Number(text);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
}

export function SimulatorView() {
  const { data, today } = useFinance();
  const id = useId();
  const baseline = useMemo(() => buildBaseline(data.transactions, today), [data.transactions, today]);

  const initialRows = (): RowState[] => {
    const rows = baseline.rows.length
      ? baseline.rows
      : FLEXIBLE_CATEGORIES.map((category) => ({ category, monthly: 0, flexible: true }));
    // Flexible categories (the ones people can actually trim) are listed first.
    return [...rows]
      .sort((a, b) => Number(b.flexible) - Number(a.flexible) || b.monthly - a.monthly)
      .map((r) => ({ category: r.category, flexible: r.flexible, amount: pesewasToDecimalString(r.monthly), percent: 0 }));
  };

  const [rows, setRows] = useState<RowState[]>(initialRows);
  const [extra, setExtra] = useState('0');
  const [horizon, setHorizon] = useState(12);
  const [goalId, setGoalId] = useState(data.goals[0]?.id ?? '');

  const result = useMemo(
    () =>
      simulate({
        rows: rows.map((r) => ({ category: r.category, monthly: toPesewas(r.amount), percent: r.percent })),
        extraIncome: toPesewas(extra),
        horizonMonths: horizon,
      }),
    [rows, extra, horizon],
  );

  const currentTotal = result.rows.reduce((s, r) => s + r.monthly, 0);
  const goal = data.goals.find((g) => g.id === goalId) ?? null;
  const impact = goal ? goalImpact(planGoal(goal, today).remaining, baseline.surplus, result.monthlySaving) : null;
  const active = result.rows.filter((r) => r.saving > 0);

  const setRow = (category: string, patch: Partial<RowState>) =>
    setRows((list) => list.map((r) => (r.category === category ? { ...r, ...patch } : r)));
  const preset = (percent: number) => setRows((list) => list.map((r) => ({ ...r, percent: r.flexible ? percent : 0 })));
  const reset = () => {
    setRows(initialRows());
    setExtra('0');
  };

  const basis =
    baseline.source === 'average'
      ? `Average of ${baseline.months.map((m) => monthLabel(m)).join(', ')} (complete months from your records)`
      : baseline.source === 'current'
        ? `This month so far (${monthLabel(baseline.months[0] ?? '')}) — no complete months recorded yet`
        : 'No spending recorded yet — type amounts to try a scenario';

  return (
    <>
      <PageHeader
        title="What-if simulator"
        subtitle="Test spending changes before you make them. Everything is calculated on this device and works offline."
        actions={<Button variant="secondary" icon={RotateCcw} onClick={reset}>Reset</Button>}
      />

      <div className="stats-grid">
        <StatCard label="Monthly saving" value={formatCedi(result.monthlySaving)} icon={Wallet} tone="green" footnote={result.monthlySaving > 0 ? 'If the change is kept every month' : 'Move a slider to start'} />
        <StatCard label={`Saved over ${horizon} months`} value={formatCedi(result.total)} icon={TrendingUp} tone="navy" footnote={`${formatCedi(result.monthlySaving)} × ${horizon}`} />
        <StatCard label="Monthly spending now" value={formatCedi(currentTotal)} icon={SlidersHorizontal} tone="blue" footnote="In the categories below" />
        <StatCard label="Monthly spending after" value={formatCedi(currentTotal - result.monthlyFromCuts)} icon={Scissors} tone="blue" footnote={result.monthlyFromCuts > 0 ? `${formatCedi(result.monthlyFromCuts)} less each month` : 'No cuts yet'} />
      </div>

      <div className="grid-2-1">
        <Card title="Your monthly spending" subtitle={basis}>
          <div className="sim-presets" role="group" aria-label="Quick scenarios">
            <Button size="sm" variant="secondary" onClick={() => preset(10)}>Cut flexible spending 10%</Button>
            <Button size="sm" variant="secondary" onClick={() => preset(20)}>Cut flexible spending 20%</Button>
            <Button size="sm" variant="ghost" onClick={() => preset(0)}>Clear cuts</Button>
          </div>
          <ul className="sim-rows">
            {rows.map((r, i) => {
              const res = result.rows[i];
              return (
                <li key={r.category} className="sim-row">
                  <div className="sim-row__head">
                    <span className="sim-row__name">
                      <CategoryDot category={r.category} /> {r.category}
                      {!r.flexible ? <Badge tone="neutral">Essential</Badge> : null}
                    </span>
                    <span className="sim-row__saving">{res && res.saving > 0 ? `−${formatCedi(res.saving)}/mo` : ''}</span>
                  </div>
                  <div className="sim-row__controls">
                    <div className="input-prefix sim-row__amount">
                      <span aria-hidden="true">{currencyLabel()}</span>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={r.amount}
                        onChange={(e) => setRow(r.category, { amount: e.target.value })}
                        aria-label={`${r.category} monthly spending`}
                      />
                    </div>
                    <input
                      className="range"
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={r.percent}
                      onChange={(e) => setRow(r.category, { percent: Number(e.target.value) })}
                      aria-label={`Reduce ${r.category} by percent`}
                      aria-valuetext={`${r.percent}% reduction`}
                    />
                    <span className="sim-row__pct">{r.percent}%</span>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="form-grid sim-extra">
            <div className="field">
              <label className="field__label" htmlFor={`${id}-extra`}>Extra monthly income ({currencyLabel()})</label>
              <div className="input-prefix">
                <span aria-hidden="true">{currencyLabel()}</span>
                <input id={`${id}-extra`} className="input" type="number" min="0" step="0.01" inputMode="decimal" value={extra} onChange={(e) => setExtra(e.target.value)} />
              </div>
              <p className="field__hint">For example a side job or weekend sales.</p>
            </div>
            <div className="field">
              <label className="field__label" htmlFor={`${id}-horizon`}>Time period</label>
              <select id={`${id}-horizon`} className="input" value={horizon} onChange={(e) => setHorizon(Number(e.target.value))}>
                {HORIZONS.map((h) => <option key={h} value={h}>{h} months</option>)}
              </select>
            </div>
          </div>
        </Card>

        <div className="stack">
          <Card title="The calculation" subtitle="Exactly how the result is worked out">
            {active.length === 0 && result.monthlySaving === 0 ? (
              <p className="muted">Move a slider or add extra income to see the calculation.</p>
            ) : (
              <ul className="calc-list">
                {active.map((r) => (
                  <li key={r.category}>
                    {r.category}: {formatCedi(r.monthly)} × {r.percent}% = <strong>{formatCedi(r.saving)}</strong> a month
                  </li>
                ))}
                {result.monthlySaving > result.monthlyFromCuts ? (
                  <li>Extra income: <strong>{formatCedi(result.monthlySaving - result.monthlyFromCuts)}</strong> a month</li>
                ) : null}
                <li className="calc-list__total">
                  Total: {formatCedi(result.monthlySaving)} × {horizon} months = <strong>{formatCedi(result.total)}</strong>
                </li>
              </ul>
            )}
            <p className="small-note-left">
              <Info size={14} aria-hidden="true" /> Assumes the change is kept up every month. Interest, inflation and price changes are not included.
            </p>
          </Card>

          <Card title="Effect on a savings goal" subtitle="If your usual surplus plus this saving goes to one goal">
            {data.goals.length === 0 ? (
              <p className="muted">Create a goal on the Goals page to see how this scenario changes it.</p>
            ) : (
              <>
                <label className="field__label" htmlFor={`${id}-goal`}>Goal</label>
                <select id={`${id}-goal`} className="input" value={goalId} onChange={(e) => setGoalId(e.target.value)}>
                  {data.goals.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                {goal && impact ? (
                  <div className="impact">
                    <p><Target size={15} aria-hidden="true" /> {formatCedi(impact.remaining)} still to save.</p>
                    {impact.remaining === 0 ? (
                      <p><strong>This goal is already reached.</strong></p>
                    ) : (
                      <>
                        <p>Now: {impact.before === null ? 'not reachable — your recent months show no money left over' : <strong>about {impact.before} month(s)</strong>}{baseline.surplus !== null && baseline.surplus > 0 ? ` (average surplus ${formatCedi(baseline.surplus)}/month)` : ''}.</p>
                        <p>With this scenario: {impact.after === null ? 'set a cut or extra income first' : <strong>about {impact.after} month(s)</strong>}{impact.sooner !== null && impact.sooner > 0 ? ` — ${impact.sooner} month(s) sooner` : ''}.</p>
                      </>
                    )}
                  </div>
                ) : null}
              </>
            )}
          </Card>
        </div>
      </div>

      <Card title="Savings over time" subtitle={`Cumulative saving for ${horizon} months`}>
        <LazySavingsChart series={result.series} />
      </Card>
    </>
  );
}
