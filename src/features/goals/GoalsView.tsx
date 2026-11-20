import { useMemo, useState } from 'react';
import { CalendarDays, Minus, Pencil, Plus, ShieldCheck, Target, Trash2 } from 'lucide-react';
import type { SavingsGoal } from '../../types/finance';
import { Badge, type BadgeTone } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { formatDisplayDate, lastNMonths, monthKeyOf, addMonths } from '../../lib/dates';
import { monthlyTotals } from '../../lib/finance';
import { planGoal, suggestedEmergencyFund, type GoalStatus } from '../../lib/goals';
import { formatCedi, formatPercent } from '../../lib/money';
import { useFinance } from '../../state/FinanceContext';
import { useToast } from '../../state/ToastContext';
import { GoalForm, GoalMoneyForm } from './GoalForm';

type Dialog =
  | { kind: 'closed' }
  | { kind: 'new'; preset?: { name: string; target: number } }
  | { kind: 'edit'; goal: SavingsGoal }
  | { kind: 'money'; goal: SavingsGoal; mode: 'add' | 'withdraw' };

const STATUS: Record<GoalStatus, { label: string; tone: BadgeTone }> = {
  complete: { label: 'Reached', tone: 'green' },
  active: { label: 'In progress', tone: 'blue' },
  'no-deadline': { label: 'No target date', tone: 'neutral' },
  overdue: { label: 'Past target date', tone: 'amber' },
};

export function GoalsView() {
  const { data, today, addGoal, updateGoal, deleteGoal, adjustGoal } = useFinance();
  const { notify } = useToast();
  const [dialog, setDialog] = useState<Dialog>({ kind: 'closed' });
  const [pendingDelete, setPendingDelete] = useState<SavingsGoal | null>(null);
  const goals = data.goals;

  const totals = useMemo(() => {
    const target = goals.reduce((s, g) => s + g.target, 0);
    const saved = goals.reduce((s, g) => s + Math.min(g.saved, g.target), 0);
    const monthly = goals.reduce((s, g) => s + (planGoal(g, today).perMonth ?? 0), 0);
    return { target, saved, monthly, ratio: target > 0 ? saved / target : 0 };
  }, [goals, today]);

  // Emergency-fund suggestion from the user's own recent spending (complete months only).
  const suggestion = useMemo(() => {
    const lastComplete = addMonths(monthKeyOf(today), -1);
    return suggestedEmergencyFund(monthlyTotals(data.transactions, lastNMonths(lastComplete, 3)));
  }, [data.transactions, today]);
  const hasEmergencyGoal = goals.some((g) => /emergency/i.test(g.name));

  const close = () => setDialog({ kind: 'closed' });

  return (
    <>
      <PageHeader
        title="Savings goals"
        subtitle="Plan for school fees, rent advance, an emergency fund or a business — and see how much to put aside each month."
        actions={<Button icon={Plus} onClick={() => setDialog({ kind: 'new' })}>New goal</Button>}
      />

      {suggestion && !hasEmergencyGoal ? (
        <Card className="suggest">
          <div className="suggest__body">
            <span className="suggest__icon" aria-hidden="true"><ShieldCheck size={22} /></span>
            <div>
              <h2 className="card__title">Build an emergency fund of about {formatCedi(suggestion.amount)}</h2>
              <p className="muted">
                A common guideline is to keep around 3 months of expenses for emergencies such as illness, job loss or urgent repairs. Your average monthly spending over the last {suggestion.monthsUsed} complete month{suggestion.monthsUsed === 1 ? '' : 's'} was {formatCedi(suggestion.average)}.
              </p>
            </div>
          </div>
          <Button variant="secondary" icon={Target} onClick={() => setDialog({ kind: 'new', preset: { name: 'Emergency fund', target: suggestion.amount } })}>
            Create this goal
          </Button>
        </Card>
      ) : null}

      {goals.length === 0 ? (
        <Card>
          <EmptyState icon={Target} title="No savings goals yet" message="Create a goal with a target amount and, optionally, a date. GOLM AI will show your progress and how much to set aside each month.">
            <Button icon={Plus} onClick={() => setDialog({ kind: 'new' })}>Create your first goal</Button>
          </EmptyState>
        </Card>
      ) : (
        <>
          <Card className="budget-summary">
            <div className="budget-summary__grid">
              <div>
                <span className="eyebrow">Saved towards goals</span>
                <p className="big-number">{formatCedi(totals.saved)}</p>
              </div>
              <div>
                <span className="eyebrow">Total of all targets</span>
                <p className="big-number">{formatCedi(totals.target)}</p>
              </div>
              <div>
                <span className="eyebrow">Needed per month (dated goals)</span>
                <p className="big-number">{formatCedi(totals.monthly)}</p>
              </div>
            </div>
            <GoalBar ratio={totals.ratio} label="Overall progress towards all goals" />
          </Card>

          <div className="budget-grid">
            {goals.map((goal) => {
              const plan = planGoal(goal, today);
              const status = STATUS[plan.status];
              return (
                <article key={goal.id} className={`budget-card goal-card goal-card--${plan.status}`}>
                  <header className="budget-card__head">
                    <h3>{goal.name}</h3>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </header>
                  <p className="budget-card__amounts">
                    <strong>{formatCedi(goal.saved)}</strong> <span className="muted">of {formatCedi(goal.target)}</span>
                  </p>
                  <GoalBar ratio={plan.progress} label={`${goal.name} progress`} />
                  <p className="budget-card__meta">
                    {formatPercent(plan.progress)} saved
                    {plan.remaining > 0 ? ` · ${formatCedi(plan.remaining)} to go` : ''}
                    {goal.isDemo ? <> · <Badge tone="blue">Demo</Badge></> : null}
                  </p>
                  <p className="goal-card__plan">
                    {plan.status === 'active' && plan.perMonth !== null ? (
                      <>
                        <CalendarDays size={15} aria-hidden="true" /> Save <strong>{formatCedi(plan.perMonth)}</strong> a month for {plan.monthsLeft} month{plan.monthsLeft === 1 ? '' : 's'} to reach it by {formatDisplayDate(goal.deadline ?? '')}.
                      </>
                    ) : plan.status === 'overdue' ? (
                      <>The target date ({formatDisplayDate(goal.deadline ?? '')}) has passed. Edit the goal to set a new date.</>
                    ) : plan.status === 'no-deadline' ? (
                      <>Add a target date to see how much to save each month.</>
                    ) : (
                      <>Goal reached — well done.</>
                    )}
                  </p>
                  <div className="budget-card__actions goal-card__actions">
                    <Button size="sm" variant="secondary" icon={Plus} onClick={() => setDialog({ kind: 'money', goal, mode: 'add' })} aria-label={`Add money to ${goal.name}`}>Add</Button>
                    <Button size="sm" variant="ghost" icon={Minus} onClick={() => setDialog({ kind: 'money', goal, mode: 'withdraw' })} disabled={goal.saved === 0} aria-label={`Withdraw from ${goal.name}`}>Withdraw</Button>
                    <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setDialog({ kind: 'edit', goal })} aria-label={`Edit ${goal.name}`}>Edit</Button>
                    <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setPendingDelete(goal)} aria-label={`Delete ${goal.name}`}>Delete</Button>
                  </div>
                </article>
              );
            })}
          </div>

          <p className="muted small-note">
            Goals record the money you set aside elsewhere (for example a savings account or Mobile Money savings). GOLM AI does not hold or move money.
          </p>
        </>
      )}

      <Modal
        open={dialog.kind === 'new' || dialog.kind === 'edit'}
        title={dialog.kind === 'edit' ? 'Edit goal' : 'New savings goal'}
        onClose={close}
      >
        <GoalForm
          key={dialog.kind === 'edit' ? dialog.goal.id : dialog.kind === 'new' ? `new-${dialog.preset?.name ?? ''}` : 'closed'}
          initial={dialog.kind === 'edit' ? dialog.goal : null}
          preset={dialog.kind === 'new' ? dialog.preset : undefined}
          today={today}
          onCancel={close}
          onSubmit={(value) => {
            if (dialog.kind === 'edit') {
              updateGoal(dialog.goal.id, value);
              notify(`“${value.name}” updated.`);
            } else {
              addGoal(value);
              notify(`“${value.name}” goal created.`);
            }
            close();
          }}
        />
      </Modal>

      <Modal
        open={dialog.kind === 'money'}
        title={dialog.kind === 'money' ? `${dialog.mode === 'add' ? 'Add money to' : 'Withdraw from'} ${dialog.goal.name}` : ''}
        description={dialog.kind === 'money' ? `Currently saved: ${formatCedi(dialog.goal.saved)} of ${formatCedi(dialog.goal.target)}` : undefined}
        onClose={close}
        size="sm"
      >
        {dialog.kind === 'money' ? (
          <GoalMoneyForm
            key={`${dialog.goal.id}-${dialog.mode}`}
            mode={dialog.mode}
            max={dialog.goal.saved}
            onCancel={close}
            onSubmit={(amount) => {
              adjustGoal(dialog.goal.id, dialog.mode === 'add' ? amount : -amount);
              notify(dialog.mode === 'add' ? `${formatCedi(amount)} added to “${dialog.goal.name}”.` : `${formatCedi(amount)} withdrawn from “${dialog.goal.name}”.`);
              close();
            }}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this goal?"
        message={pendingDelete ? `“${pendingDelete.name}” and its saved total of ${formatCedi(pendingDelete.saved)} will be removed from GOLM AI. Your transactions are not affected.` : ''}
        confirmLabel="Delete goal"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            deleteGoal(pendingDelete.id);
            notify('Goal deleted.', 'info');
          }
          setPendingDelete(null);
        }}
      />
    </>
  );
}

function GoalBar({ ratio, label }: { ratio: number; label: string }) {
  const percent = Math.round(Math.min(ratio, 1) * 100);
  return (
    <div className="progress progress--goal" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={`${percent}% saved`}>
      <div className="progress__fill" style={{ width: `${percent}%` }} />
    </div>
  );
}
