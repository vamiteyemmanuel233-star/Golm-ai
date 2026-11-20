import type { Transaction, TransactionType } from '../types/finance';

let counter = 0;

/** Builds a test transaction; amounts are given in CEDIS for readability. */
export function tx(
  type: TransactionType,
  cedis: number,
  category: string,
  date: string,
  description = '',
): Transaction {
  counter += 1;
  return {
    id: `t${counter}`,
    type,
    amount: Math.round(cedis * 100),
    category,
    description,
    date,
    isDemo: false,
    createdAt: `2026-01-01T00:00:${String(counter % 60).padStart(2, '0')}.000Z`,
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}
