import { ArrowDownLeft, ArrowUpRight, Pencil, Trash2 } from 'lucide-react';
import type { Transaction } from '../types/finance';
import { categoryColor } from '../lib/categories';
import { formatDisplayDate } from '../lib/dates';
import { formatCedi } from '../lib/money';
import { Badge, type BadgeTone } from '../components/Badge';
import type { Severity } from '../lib/insights';
import type { BudgetState } from '../lib/finance';

export function CategoryDot({ category }: { category: string }) {
  return <span className="dot" style={{ background: categoryColor(category) }} aria-hidden="true" />;
}

export function Amount({ transaction }: { transaction: Transaction }) {
  const sign = transaction.type === 'income' ? 1 : -1;
  return (
    <span className={`amount amount--${transaction.type}`}>
      {formatCedi(sign * transaction.amount, { showPlus: true })}
    </span>
  );
}

export function TypeIcon({ type }: { type: Transaction['type'] }) {
  return (
    <span className={`type-icon type-icon--${type}`} aria-hidden="true">
      {type === 'income' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
    </span>
  );
}

/** Compact list item used on the dashboard. */
export function TransactionRow({ transaction, onEdit, onDelete }: { transaction: Transaction; onEdit?: () => void; onDelete?: () => void }) {
  const title = transaction.description || transaction.category;
  return (
    <li className="tx-row">
      <TypeIcon type={transaction.type} />
      <div className="tx-row__main">
        <span className="tx-row__title">
          <span className="tx-row__text">{title}</span>
          {transaction.isDemo ? <Badge tone="blue">Demo</Badge> : null}
        </span>
        <span className="tx-row__meta">
          <CategoryDot category={transaction.category} /> {transaction.category} · {formatDisplayDate(transaction.date)}
        </span>
      </div>
      <Amount transaction={transaction} />
      {onEdit || onDelete ? (
        <div className="row-actions">
          {onEdit ? (
            <button type="button" className="icon-btn icon-btn--sm" onClick={onEdit} aria-label={`Edit ${title}`}>
              <Pencil size={16} aria-hidden="true" />
            </button>
          ) : null}
          {onDelete ? (
            <button type="button" className="icon-btn icon-btn--sm icon-btn--danger" onClick={onDelete} aria-label={`Delete ${title}`}>
              <Trash2 size={16} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export const SEVERITY_TONE: Record<Severity, BadgeTone> = { critical: 'red', warning: 'amber', info: 'blue', positive: 'green' };
export const SEVERITY_LABEL: Record<Severity, string> = { critical: 'Action needed', warning: 'Watch', info: 'Tip', positive: 'Good' };
export const BUDGET_TONE: Record<BudgetState, BadgeTone> = { ok: 'green', warning: 'amber', over: 'red' };
export const BUDGET_LABEL: Record<BudgetState, string> = { ok: 'On track', warning: 'Nearly used', over: 'Over budget' };
