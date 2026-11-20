import { useMemo, useState } from 'react';
import { Pencil, PiggyBank, Plus, Trash2 } from 'lucide-react';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { ProgressBar } from '../../components/ProgressBar';
import { EXPENSE_CATEGORIES } from '../../lib/categories';
import { budgetState, budgetUtilization, categoryBreakdown, totalBudgetUtilization } from '../../lib/finance';
import { formatCedi, formatPercent } from '../../lib/money';
import { useFinance } from '../../state/FinanceContext';
import { useToast } from '../../state/ToastContext';
import { useMonthMeta } from '../layout/MonthPicker';
import { BUDGET_LABEL, BUDGET_TONE, CategoryDot } from '../shared';
import { BudgetForm } from './BudgetForm';

type Dialog = { mode: 'closed' } | { mode: 'new'; preset?: string } | { mode: 'edit'; category: string; limit: number };

export function BudgetsView() {
  const { data, setBudget, removeBudget } = useFinance();
  const { notify } = useToast();
  const { month, label, isCurrent } = useMonthMeta();
  const [dialog, setDialog] = useState<Dialog>({ mode: 'closed' });
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);

  const statuses = useMemo(() => budgetUtilization(data.transactions, data.budgets, month), [data, month]);
  const totals = totalBudgetUtilization(statuses);
  const available = EXPENSE_CATEGORIES.filter((c) => !data.budgets.some((b) => b.category === c));
  const unbudgeted = useMemo(
    () => categoryBreakdown(data.transactions, 'expense', month).filter((c) => !data.budgets.some((b) => b.category === c.category)),
    [data, month],
  );

  return (
    <>
      <PageHeader
        title="Budgets"
        subtitle={`Monthly limits for ${label}${isCurrent ? ' (month to date)' : ''}.`}
        actions={<Button icon={Plus} onClick={() => setDialog({ mode: 'new' })} disabled={available.length === 0}>Add budget</Button>}
      />

      {statuses.length === 0 ? (
        <Card>
          <EmptyState icon={PiggyBank} title="No budgets yet" message="Set a monthly limit for a category and GOLM AI will warn you at 85% and when you go over.">
            <Button icon={Plus} onClick={() => setDialog({ mode: 'new' })}>Create your first budget</Button>
          </EmptyState>
        </Card>
      ) : (
        <>
          <Card className="budget-summary">
            <div className="budget-summary__grid">
              <div>
                <span className="eyebrow">Total budgeted</span>
                <p className="big-number">{formatCedi(totals.limit)}</p>
              </div>
              <div>
                <span className="eyebrow">Spent in budgeted categories</span>
                <p className="big-number">{formatCedi(totals.spent)}</p>
              </div>
              <div>
                <span className="eyebrow">Overall utilisation</span>
                <p className="big-number">{formatPercent(totals.ratio)}</p>
              </div>
            </div>
            <ProgressBar ratio={totals.ratio} state={budgetState(totals.ratio)} label="Overall budget utilisation" />
          </Card>

          <div className="budget-grid">
            {statuses.map((s) => (
              <article key={s.category} className={`budget-card budget-card--${s.state}`}>
                <header className="budget-card__head">
                  <h3><CategoryDot category={s.category} /> {s.category}</h3>
                  <Badge tone={BUDGET_TONE[s.state]}>{BUDGET_LABEL[s.state]}</Badge>
                </header>
                <p className="budget-card__amounts">
                  <strong>{formatCedi(s.spent)}</strong> <span className="muted">of {formatCedi(s.limit)}</span>
                </p>
                <ProgressBar ratio={s.ratio} state={s.state} label={`${s.category} budget used`} />
                <p className="budget-card__meta">
                  {s.remaining >= 0 ? `${formatCedi(s.remaining)} left` : `${formatCedi(-s.remaining)} over`} · {formatPercent(s.ratio)} used
                  {s.isDemo ? <> · <Badge tone="blue">Demo</Badge></> : null}
                </p>
                <div className="budget-card__actions">
                  <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setDialog({ mode: 'edit', category: s.category, limit: s.limit })} aria-label={`Edit ${s.category} budget`}>Edit</Button>
                  <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setPendingRemove(s.category)} aria-label={`Remove ${s.category} budget`}>Remove</Button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {unbudgeted.length > 0 ? (
        <Card title="Spending without a budget" subtitle={`Categories with expenses in ${label} but no limit set`}>
          <ul className="simple-list">
            {unbudgeted.map((c) => (
              <li key={c.category}>
                <span><CategoryDot category={c.category} /> {c.category}</span>
                <span className="simple-list__right">
                  <strong>{formatCedi(c.total)}</strong>
                  <Button size="sm" variant="secondary" onClick={() => setDialog({ mode: 'new', preset: c.category })} aria-label={`Set a budget for ${c.category}`}>Set budget</Button>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Modal
        open={dialog.mode !== 'closed'}
        title={dialog.mode === 'edit' ? `Edit ${dialog.category} budget` : 'New budget'}
        onClose={() => setDialog({ mode: 'closed' })}
        size="sm"
      >
        <BudgetForm
          key={dialog.mode === 'edit' ? dialog.category : dialog.mode === 'new' ? `new-${dialog.preset ?? ''}` : 'closed'}
          categories={available}
          editing={dialog.mode === 'edit' ? { category: dialog.category, limit: dialog.limit } : null}
          presetCategory={dialog.mode === 'new' ? dialog.preset : undefined}
          onCancel={() => setDialog({ mode: 'closed' })}
          onSubmit={(category, limit) => {
            setBudget(category, limit);
            notify(dialog.mode === 'edit' ? `${category} budget updated.` : `${category} budget created.`);
            setDialog({ mode: 'closed' });
          }}
        />
      </Modal>

      <ConfirmDialog
        open={pendingRemove !== null}
        title="Remove this budget?"
        message={`The ${pendingRemove ?? ''} budget will be removed. Your transactions are not affected.`}
        confirmLabel="Remove budget"
        onCancel={() => setPendingRemove(null)}
        onConfirm={() => {
          if (pendingRemove) {
            removeBudget(pendingRemove);
            notify(`${pendingRemove} budget removed.`, 'info');
          }
          setPendingRemove(null);
        }}
      />
    </>
  );
}
