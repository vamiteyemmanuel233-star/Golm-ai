import { useMemo, useState } from 'react';
import { Download, FilterX, Pencil, Plus, Receipt, Search, Trash2 } from 'lucide-react';
import type { Transaction } from '../../types/finance';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../lib/categories';
import { PAYMENT_METHODS, paymentMethodLabel } from '../../lib/paymentMethods';
import { csvFileName, downloadCsv, transactionsToCsv } from '../../lib/csv';
import { formatDisplayDate } from '../../lib/dates';
import { EMPTY_FILTER, filterTransactions, isFilterActive, summarize, type TransactionFilter } from '../../lib/finance';
import { formatCedi } from '../../lib/money';
import { useFinance } from '../../state/FinanceContext';
import { useToast } from '../../state/ToastContext';
import { useUi } from '../../state/UiContext';
import { Amount, CategoryDot, TypeIcon } from '../shared';

const PAGE_SIZE = 25;

export function TransactionsView() {
  const { data, deleteTransaction, today } = useFinance();
  const { openNewTransaction, openEditTransaction } = useUi();
  const { notify } = useToast();
  const [filter, setFilter] = useState<TransactionFilter>(EMPTY_FILTER);
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const results = useMemo(() => filterTransactions(data.transactions, filter), [data.transactions, filter]);
  const totals = useMemo(() => summarize(results), [results]);
  const active = isFilterActive(filter);
  const rangeError = filter.from && filter.to && filter.from > filter.to ? 'The “from” date is after the “to” date.' : '';

  const set = <K extends keyof TransactionFilter>(key: K, value: TransactionFilter[K]) => {
    setFilter((f) => ({ ...f, [key]: value }));
    setVisible(PAGE_SIZE);
  };

  const exportCsv = () => {
    if (results.length === 0) return;
    downloadCsv(transactionsToCsv(results), csvFileName(today));
    notify(`Exported ${results.length} transaction${results.length === 1 ? '' : 's'} to CSV.`);
  };

  const categoryOptions: readonly string[] = filter.type === 'income' ? INCOME_CATEGORIES : filter.type === 'expense' ? EXPENSE_CATEGORIES : [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

  return (
    <>
      <PageHeader
        title="Transactions"
        subtitle="Every income and expense you have recorded."
        actions={
          <>
            <Button variant="secondary" icon={Download} onClick={exportCsv} disabled={results.length === 0}>
              Export {active ? 'filtered ' : ''}CSV
            </Button>
            <Button icon={Plus} onClick={openNewTransaction}>Add transaction</Button>
          </>
        }
      />

      {data.transactions.length === 0 ? (
        <Card>
          <EmptyState icon={Receipt} title="No transactions yet" message="Add your first income or expense to start tracking.">
            <Button icon={Plus} onClick={openNewTransaction}>Add transaction</Button>
          </EmptyState>
        </Card>
      ) : (
        <Card>
          <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
            <div className="filters__search">
              <Search size={18} aria-hidden="true" />
              <label htmlFor="tx-search" className="sr-only">Search transactions</label>
              <input id="tx-search" className="input" type="search" placeholder="Search description or category" value={filter.search} onChange={(e) => set('search', e.target.value)} />
            </div>
            <div className="filters__field">
              <label htmlFor="tx-type">Type</label>
              <select
                id="tx-type"
                className="input"
                value={filter.type}
                onChange={(e) => {
                  const type = e.target.value as TransactionFilter['type'];
                  setFilter((f) => ({ ...f, type, category: 'all' }));
                }}
              >
                <option value="all">All types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div className="filters__field">
              <label htmlFor="tx-category">Category</label>
              <select id="tx-category" className="input" value={filter.category} onChange={(e) => set('category', e.target.value)}>
                <option value="all">All categories</option>
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="filters__field">
              <label htmlFor="tx-method">Method</label>
              <select id="tx-method" className="input" value={filter.method} onChange={(e) => set('method', e.target.value as TransactionFilter['method'])}>
                <option value="all">All methods</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="filters__field">
              <label htmlFor="tx-from">From</label>
              <input id="tx-from" className="input" type="date" value={filter.from} max={today} onChange={(e) => set('from', e.target.value)} aria-invalid={rangeError ? true : undefined} />
            </div>
            <div className="filters__field">
              <label htmlFor="tx-to">To</label>
              <input id="tx-to" className="input" type="date" value={filter.to} max={today} onChange={(e) => set('to', e.target.value)} aria-invalid={rangeError ? true : undefined} />
            </div>
            <Button variant="ghost" icon={FilterX} onClick={() => setFilter(EMPTY_FILTER)} disabled={!active} className="filters__clear">
              Clear
            </Button>
          </form>
          {rangeError ? <p className="field__error" role="alert">{rangeError}</p> : null}

          <div className="results-bar" aria-live="polite">
            <span>
              <strong>{results.length}</strong> {results.length === 1 ? 'transaction' : 'transactions'}
            </span>
            <span className="results-bar__totals">
              In <strong className="text-income">{formatCedi(totals.income)}</strong> · Out <strong className="text-expense">{formatCedi(totals.expenses)}</strong> · Net <strong>{formatCedi(totals.net)}</strong>
            </span>
          </div>

          {results.length === 0 ? (
            <EmptyState icon={Search} title="No matching transactions" message="Try a different search term or clear the filters.">
              <Button variant="secondary" icon={FilterX} onClick={() => setFilter(EMPTY_FILTER)}>Clear filters</Button>
            </EmptyState>
          ) : (
            <>
              <div className="table-wrap">
                <table className="table">
                  <caption className="sr-only">Transactions, newest first</caption>
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Description</th>
                      <th scope="col">Category</th>
                      <th scope="col">Method</th>
                      <th scope="col" className="num">Amount</th>
                      <th scope="col"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.slice(0, visible).map((t) => {
                      const title = t.description || t.category;
                      return (
                        <tr key={t.id}>
                          <td data-label="Date">{formatDisplayDate(t.date)}</td>
                          <td data-label="Description">
                            <span className="table__desc">
                              <TypeIcon type={t.type} />
                              <span>{t.description || <span className="muted">No description</span>}</span>
                              {t.isDemo ? <Badge tone="blue">Demo</Badge> : null}
                            </span>
                          </td>
                          <td data-label="Category"><CategoryDot category={t.category} /> {t.category}</td>
                          <td data-label="Method">{t.method ? paymentMethodLabel(t.method) : <span className="muted">Not recorded</span>}</td>
                          <td data-label="Amount" className="num"><Amount transaction={t} /></td>
                          <td className="table__actions">
                            <button type="button" className="icon-btn icon-btn--sm" onClick={() => openEditTransaction(t)} aria-label={`Edit ${title}, ${formatDisplayDate(t.date)}`}>
                              <Pencil size={16} aria-hidden="true" />
                            </button>
                            <button type="button" className="icon-btn icon-btn--sm icon-btn--danger" onClick={() => setPendingDelete(t)} aria-label={`Delete ${title}, ${formatDisplayDate(t.date)}`}>
                              <Trash2 size={16} aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {visible < results.length ? (
                <div className="load-more">
                  <Button variant="secondary" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                    Show more ({results.length - visible} remaining)
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </Card>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this transaction?"
        message={pendingDelete ? `“${pendingDelete.description || pendingDelete.category}” — ${formatCedi(pendingDelete.amount)} on ${formatDisplayDate(pendingDelete.date)}. This cannot be undone.` : ''}
        confirmLabel="Delete"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            deleteTransaction(pendingDelete.id);
            notify('Transaction deleted.', 'info');
          }
          setPendingDelete(null);
        }}
      />
    </>
  );
}
