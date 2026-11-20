import type { Budget, MonthKey, PaymentMethod, Transaction, TransactionType } from '../types/finance';
import { monthKeyOf } from './dates';

/* ------------------------------------------------------------------ */
/* Summaries                                                            */
/* ------------------------------------------------------------------ */

export interface PeriodSummary {
  income: number;
  expenses: number;
  /** income − expenses (the amount saved, or overspent if negative) */
  net: number;
  /** net ÷ income, or null when there is no income to divide by */
  savingsRate: number | null;
  transactionCount: number;
}

/** Totals for one month, or for all time when `month` is omitted. */
export function summarize(transactions: readonly Transaction[], month?: MonthKey): PeriodSummary {
  let income = 0;
  let expenses = 0;
  let transactionCount = 0;
  for (const tx of transactions) {
    if (month && monthKeyOf(tx.date) !== month) continue;
    transactionCount += 1;
    if (tx.type === 'income') income += tx.amount;
    else expenses += tx.amount;
  }
  const net = income - expenses;
  return {
    income,
    expenses,
    net,
    savingsRate: income > 0 ? net / income : null,
    transactionCount,
  };
}

export interface MonthTotal {
  month: MonthKey;
  income: number;
  expenses: number;
  net: number;
}

/** Income/expense totals for each requested month (months with no data are 0). */
export function monthlyTotals(transactions: readonly Transaction[], months: readonly MonthKey[]): MonthTotal[] {
  const map = new Map<MonthKey, MonthTotal>(
    months.map((month) => [month, { month, income: 0, expenses: 0, net: 0 }]),
  );
  for (const tx of transactions) {
    const entry = map.get(monthKeyOf(tx.date));
    if (!entry) continue;
    if (tx.type === 'income') entry.income += tx.amount;
    else entry.expenses += tx.amount;
  }
  return months.map((month) => {
    const entry = map.get(month) ?? { month, income: 0, expenses: 0, net: 0 };
    return { ...entry, net: entry.income - entry.expenses };
  });
}

export interface CategoryTotal {
  category: string;
  total: number;
  /** Fraction of the type's total (0–1) */
  share: number;
  count: number;
}

/** Totals per category, largest first. */
export function categoryBreakdown(
  transactions: readonly Transaction[],
  type: TransactionType,
  month?: MonthKey,
): CategoryTotal[] {
  const totals = new Map<string, { total: number; count: number }>();
  let grand = 0;
  for (const tx of transactions) {
    if (tx.type !== type) continue;
    if (month && monthKeyOf(tx.date) !== month) continue;
    const current = totals.get(tx.category) ?? { total: 0, count: 0 };
    current.total += tx.amount;
    current.count += 1;
    totals.set(tx.category, current);
    grand += tx.amount;
  }
  return [...totals.entries()]
    .map(([category, { total, count }]) => ({
      category,
      total,
      count,
      share: grand > 0 ? total / grand : 0,
    }))
    .sort((a, b) => b.total - a.total || a.category.localeCompare(b.category));
}

/* ------------------------------------------------------------------ */
/* Budgets                                                              */
/* ------------------------------------------------------------------ */

/** At or above 85% of a budget we warn the user. */
export const BUDGET_WARNING_RATIO = 0.85;

export type BudgetState = 'ok' | 'warning' | 'over';

export interface BudgetStatus {
  category: string;
  limit: number;
  spent: number;
  /** limit − spent (negative when over budget) */
  remaining: number;
  /** spent ÷ limit */
  ratio: number;
  state: BudgetState;
  isDemo: boolean;
}

export function budgetState(ratio: number): BudgetState {
  if (ratio > 1) return 'over';
  if (ratio >= BUDGET_WARNING_RATIO) return 'warning';
  return 'ok';
}

/** How much of each monthly budget has been used in `month`, most-used first. */
export function budgetUtilization(
  transactions: readonly Transaction[],
  budgets: readonly Budget[],
  month: MonthKey,
): BudgetStatus[] {
  const spentByCategory = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== 'expense' || monthKeyOf(tx.date) !== month) continue;
    spentByCategory.set(tx.category, (spentByCategory.get(tx.category) ?? 0) + tx.amount);
  }
  return budgets
    .map((budget) => {
      const spent = spentByCategory.get(budget.category) ?? 0;
      const ratio = budget.limit > 0 ? spent / budget.limit : 0;
      return {
        category: budget.category,
        limit: budget.limit,
        spent,
        remaining: budget.limit - spent,
        ratio,
        state: budgetState(ratio),
        isDemo: budget.isDemo,
      };
    })
    .sort((a, b) => b.ratio - a.ratio || a.category.localeCompare(b.category));
}

export interface BudgetTotals {
  limit: number;
  spent: number;
  ratio: number;
}

/** Combined totals across all budgeted categories. */
export function totalBudgetUtilization(statuses: readonly BudgetStatus[]): BudgetTotals {
  const limit = statuses.reduce((sum, s) => sum + s.limit, 0);
  const spent = statuses.reduce((sum, s) => sum + s.spent, 0);
  return { limit, spent, ratio: limit > 0 ? spent / limit : 0 };
}

/* ------------------------------------------------------------------ */
/* Search, filter and sorting                                           */
/* ------------------------------------------------------------------ */

export interface TransactionFilter {
  search: string;
  type: 'all' | TransactionType;
  category: string; // 'all' or a category name
  method: 'all' | PaymentMethod;
  from: string; // '' or YYYY-MM-DD (inclusive)
  to: string; // '' or YYYY-MM-DD (inclusive)
}

export const EMPTY_FILTER: TransactionFilter = {
  search: '',
  type: 'all',
  category: 'all',
  method: 'all',
  from: '',
  to: '',
};

export function isFilterActive(filter: TransactionFilter): boolean {
  return (
    filter.search.trim() !== '' ||
    filter.type !== 'all' ||
    filter.category !== 'all' ||
    filter.method !== 'all' ||
    filter.from !== '' ||
    filter.to !== ''
  );
}

/** Newest first; ties broken by creation time so the order is stable. */
export function sortTransactions(transactions: readonly Transaction[]): Transaction[] {
  return [...transactions].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  );
}

export function filterTransactions(
  transactions: readonly Transaction[],
  filter: TransactionFilter,
): Transaction[] {
  const query = filter.search.trim().toLowerCase();
  return sortTransactions(
    transactions.filter((tx) => {
      if (filter.type !== 'all' && tx.type !== filter.type) return false;
      if (filter.category !== 'all' && tx.category !== filter.category) return false;
      if (filter.method !== 'all' && tx.method !== filter.method) return false;
      // ISO dates compare correctly as strings.
      if (filter.from && tx.date < filter.from) return false;
      if (filter.to && tx.date > filter.to) return false;
      if (query) {
        const haystack = `${tx.description} ${tx.category}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    }),
  );
}

/** Every month that has at least one transaction, oldest first. */
export function monthsWithData(transactions: readonly Transaction[]): MonthKey[] {
  return [...new Set(transactions.map((tx) => monthKeyOf(tx.date)))].sort();
}

/* ------------------------------------------------------------------ */
/* Payment methods                                                      */
/* ------------------------------------------------------------------ */

export interface MethodTotal {
  /** 'unrecorded' for older transactions saved before methods existed */
  method: PaymentMethod | 'unrecorded';
  total: number;
  share: number;
  count: number;
}

/** Totals per payment method (Mobile Money, cash, bank, card), largest first. */
export function methodBreakdown(
  transactions: readonly Transaction[],
  type: TransactionType,
  month?: MonthKey,
): MethodTotal[] {
  const totals = new Map<MethodTotal['method'], { total: number; count: number }>();
  let grand = 0;
  for (const tx of transactions) {
    if (tx.type !== type) continue;
    if (month && monthKeyOf(tx.date) !== month) continue;
    const key = tx.method ?? 'unrecorded';
    const current = totals.get(key) ?? { total: 0, count: 0 };
    current.total += tx.amount;
    current.count += 1;
    totals.set(key, current);
    grand += tx.amount;
  }
  return [...totals.entries()]
    .map(([method, { total, count }]) => ({ method, total, count, share: grand > 0 ? total / grand : 0 }))
    .sort((a, b) => b.total - a.total);
}
