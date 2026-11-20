import type { TransactionType } from '../types/finance';

export const INCOME_CATEGORIES = [
  'Salary',
  'Business',
  'Freelance',
  'Gifts',
  'Other Income',
] as const;

export const EXPENSE_CATEGORIES = [
  'Food & Groceries',
  'Transport',
  'Rent & Housing',
  'Utilities',
  'Mobile Data & Airtime',
  'Health',
  'Education',
  'Entertainment',
  'Shopping',
  'Family Support',
  'Savings & Investments',
  'Other Expense',
] as const;

export function categoriesFor(type: TransactionType): readonly string[] {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function isValidCategory(type: TransactionType, category: string): boolean {
  return categoriesFor(type).includes(category);
}

/** Chart colours — tuned to stay distinguishable in light and dark mode. */
const PALETTE = [
  '#2f5bea', // royal blue
  '#14b8a6', // teal
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ef4444', // red
  '#0ea5e9', // sky
  '#22c55e', // green
  '#ec4899', // pink
  '#64748b', // slate
  '#a16207', // ochre
  '#6366f1', // indigo
  '#84cc16', // lime
];

export function categoryColor(category: string): string {
  const all: readonly string[] = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
  const index = all.indexOf(category);
  const safeIndex = index >= 0 ? index : hash(category);
  return PALETTE[safeIndex % PALETTE.length] ?? '#2f5bea';
}

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}
