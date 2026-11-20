import { describe, expect, it } from 'vitest';
import { validateTransaction, type TransactionInput } from './validation';

const base: TransactionInput = { type: 'expense', amount: '45.50', category: 'Transport', date: '2026-11-10', description: '  Trotro   to Madina ', method: 'momo' };
const today = '2026-11-20';

describe('validateTransaction', () => {
  it('accepts valid input and normalises it', () => {
    const r = validateTransaction(base, today);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.amount).toBe(4550);
      expect(r.value.description).toBe('Trotro to Madina');
    }
  });

  it('rejects future dates, impossible dates and bad amounts', () => {
    const future = validateTransaction({ ...base, date: '2026-11-21' }, today);
    expect(future.ok).toBe(false);
    if (!future.ok) expect(future.errors.date).toContain('future');
    expect(validateTransaction({ ...base, date: '2026-02-30' }, today).ok).toBe(false);
    expect(validateTransaction({ ...base, date: '' }, today).ok).toBe(false);
    const amount = validateTransaction({ ...base, amount: '-3' }, today);
    expect(!amount.ok && amount.errors.amount !== undefined).toBe(true);
  });

  it('requires a category that matches the type', () => {
    const r = validateTransaction({ ...base, type: 'income', category: 'Transport' }, today);
    expect(!r.ok && r.errors.category !== undefined).toBe(true);
    expect(validateTransaction({ ...base, category: '' }, today).ok).toBe(false);
  });

  it('requires a payment method', () => {
    const r = validateTransaction({ ...base, method: '' }, today);
    expect(!r.ok && r.errors.method !== undefined).toBe(true);
    const ok = validateTransaction(base, today);
    expect(ok.ok && ok.value.method === 'momo').toBe(true);
  });

  it('limits description length', () => {
    expect(validateTransaction({ ...base, description: 'x'.repeat(121) }, today).ok).toBe(false);
    expect(validateTransaction({ ...base, description: '' }, today).ok).toBe(true);
  });
});
