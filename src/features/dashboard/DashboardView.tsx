import { useMemo } from 'react';
import { ArrowRight, Database, Landmark, Plus, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { routeHref } from '../../app/routes';
import { BRAND } from '../../brand';
import { Badge } from '../../components/Badge';
import { Button, ButtonLink } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { ProgressBar } from '../../components/ProgressBar';
import { StatCard } from '../../components/StatCard';
import { lastNMonths, monthLabel } from '../../lib/dates';
import { budgetUtilization, categoryBreakdown, monthlyTotals, sortTransactions, summarize } from '../../lib/finance';
import { buildRecommendations, detectUnusualExpenses } from '../../lib/insights';
import { formatCedi, formatPercent } from '../../lib/money';
import { useFinance } from '../../state/FinanceContext';
import { useToast } from '../../state/ToastContext';
import { useUi } from '../../state/UiContext';
import { LazyCashflowChart } from '../charts/LazyCharts';
import { useMonthMeta } from '../layout/MonthPicker';
import { BUDGET_LABEL, BUDGET_TONE, CategoryDot, SEVERITY_LABEL, SEVERITY_TONE, TransactionRow } from '../shared';

function change(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / previous;
}

export function DashboardView() {
  const { data, today, loadDemo } = useFinance();
  const { openNewTransaction } = useUi();
  const { notify } = useToast();
  const { month, previous, label, isCurrent } = useMonthMeta();
  const { transactions, budgets } = data;

  const view = useMemo(() => {
    const summary = summarize(transactions, month);
    const prior = summarize(transactions, previous);
    const allTime = summarize(transactions);
    const trend = monthlyTotals(transactions, lastNMonths(month, 6));
    const categories = categoryBreakdown(transactions, 'expense', month).slice(0, 5);
    const budgetStatus = budgetUtilization(transactions, budgets, month).slice(0, 4);
    const unusual = detectUnusualExpenses(transactions, { month });
    const recs = buildRecommendations({
      transactions, budgets, month, today,
      previousMonths: monthlyTotals(transactions, lastNMonths(previous, 3)),
      unusual,
    }).slice(0, 3);
    const recent = sortTransactions(transactions).slice(0, 6);
    return { summary, prior, allTime, trend, categories, budgetStatus, recs, recent };
  }, [transactions, budgets, month, previous, today]);

  if (transactions.length === 0) {
    return (
      <>
        <PageHeader title="Welcome to GOLM AI" subtitle={`${BRAND.tagline} Track income and spending — cash, Mobile Money, bank or card — set budgets and savings goals, test what-if plans and get coaching from your own data.`} />
        <Card>
          <EmptyState icon={Wallet} title="No transactions yet" message="Add your first income or expense to see your dashboard. You can also load clearly-labelled demonstration data to explore every feature.">
            <Button icon={Plus} onClick={openNewTransaction}>Add first transaction</Button>
            <Button
              variant="secondary"
              icon={Database}
              onClick={() => {
                loadDemo();
                notify('Demo data loaded — marked as demonstration only.', 'info');
              }}
            >
              Load demo data
            </Button>
            <ButtonLink href={routeHref('about')} variant="ghost">How GOLM AI works</ButtonLink>
          </EmptyState>
        </Card>
        <div className="feature-grid">
          {[
            ['Transactions', 'Add, edit, search, filter and export to CSV.'],
            ['Budgets', 'Monthly limits per category with early warnings.'],
            ['Insights', 'Unusual-expense detection and a transparent forecast.'],
            ['Assistant', 'Ask questions about your budget; live AI is optional.'],
          ].map(([title, text]) => (
            <div key={title} className="feature">
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </>
    );
  }

  const { summary, prior, allTime } = view;
  const incomeChange = change(summary.income, prior.income);
  const expenseChange = change(summary.expenses, prior.expenses);
  const prevLabel = monthLabel(previous);

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`${label}${isCurrent ? ' · month to date' : ''}`} />

      <div className="stats-grid">
        <StatCard
          label="Income"
          value={formatCedi(summary.income)}
          icon={TrendingUp}
          tone="green"
          footnote={incomeChange === null ? `No income in ${prevLabel}` : `${incomeChange >= 0 ? '▲' : '▼'} ${formatPercent(Math.abs(incomeChange))} vs ${prevLabel}`}
          footnoteTone={incomeChange === null ? 'neutral' : incomeChange >= 0 ? 'good' : 'bad'}
        />
        <StatCard
          label="Expenses"
          value={formatCedi(summary.expenses)}
          icon={TrendingDown}
          tone="blue"
          footnote={expenseChange === null ? `No expenses in ${prevLabel}` : `${expenseChange >= 0 ? '▲' : '▼'} ${formatPercent(Math.abs(expenseChange))} vs ${prevLabel}`}
          footnoteTone={expenseChange === null ? 'neutral' : expenseChange <= 0 ? 'good' : 'bad'}
        />
        <StatCard
          label="Net savings"
          value={formatCedi(summary.net)}
          icon={Wallet}
          tone={summary.net >= 0 ? 'navy' : 'red'}
          footnote={summary.savingsRate === null ? 'Savings rate needs income' : `Savings rate ${formatPercent(summary.savingsRate)}`}
          footnoteTone={summary.savingsRate === null ? 'neutral' : summary.savingsRate >= 0.1 ? 'good' : 'bad'}
        />
        <StatCard label="Net balance (all time)" value={formatCedi(allTime.net)} icon={Landmark} tone="navy" footnote={`${allTime.transactionCount} transactions recorded`} />
      </div>

      <div className="grid-2-1">
        <Card title="Cash flow" subtitle="Income vs expenses, last 6 months" action={<ButtonLink href={routeHref('analytics')} size="sm" variant="ghost" icon={ArrowRight}>Analytics</ButtonLink>}>
          <LazyCashflowChart data={view.trend} />
        </Card>

        <Card title="Top spending" subtitle={label}>
          {view.categories.length === 0 ? (
            <p className="muted">No expenses recorded this month.</p>
          ) : (
            <ul className="bar-list">
              {view.categories.map((c) => (
                <li key={c.category}>
                  <div className="bar-list__row">
                    <span><CategoryDot category={c.category} /> {c.category}</span>
                    <strong>{formatCedi(c.total)}</strong>
                  </div>
                  <div className="bar-list__track" aria-hidden="true">
                    <span style={{ width: `${Math.max(c.share * 100, 2)}%` }} />
                  </div>
                  <span className="bar-list__share">{formatPercent(c.share)} of spending</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid-3">
        <Card title="Smart insights" subtitle="Rule-based, from your data" action={<ButtonLink href={routeHref('insights')} size="sm" variant="ghost" icon={ArrowRight}>All</ButtonLink>}>
          <ul className="insight-mini">
            {view.recs.map((r) => (
              <li key={r.id}>
                <Badge tone={SEVERITY_TONE[r.severity]}>{SEVERITY_LABEL[r.severity]}</Badge>
                <p>{r.title}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Budgets" subtitle={label} action={<ButtonLink href={routeHref('budgets')} size="sm" variant="ghost" icon={ArrowRight}>Manage</ButtonLink>}>
          {view.budgetStatus.length === 0 ? (
            <p className="muted">No budgets yet. Set monthly limits on the Budgets page.</p>
          ) : (
            <ul className="budget-mini">
              {view.budgetStatus.map((b) => (
                <li key={b.category}>
                  <div className="budget-mini__row">
                    <span>{b.category}</span>
                    <Badge tone={BUDGET_TONE[b.state]}>{BUDGET_LABEL[b.state]}</Badge>
                  </div>
                  <ProgressBar ratio={b.ratio} state={b.state} label={`${b.category} budget`} />
                  <span className="budget-mini__meta">{formatCedi(b.spent)} of {formatCedi(b.limit)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent activity" action={<ButtonLink href={routeHref('transactions')} size="sm" variant="ghost" icon={ArrowRight}>View all</ButtonLink>}>
          <ul className="tx-list">
            {view.recent.map((t) => (
              <TransactionRow key={t.id} transaction={t} />
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
