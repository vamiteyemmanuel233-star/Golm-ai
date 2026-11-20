import { describe, expect, it } from 'vitest';
import { financeReducer, hasDemoData } from './reducer';
import { emptyData } from '../lib/storage';
import { tx } from '../lib/testUtils';
import type { SavingsGoal } from '../types/finance';

const goal = (id: string): SavingsGoal => ({ id, name: 'Emergency fund', target: 100000, saved: 20000, deadline: null, isDemo: false, createdAt: 'x', updatedAt: 'x' });

describe('financeReducer', () => {
  it('adds, updates and deletes transactions', () => {
    const t = tx('expense', 10, 'Transport', '2026-11-01');
    let state = financeReducer(emptyData(), { type: 'transaction/add', transaction: t });
    expect(state.transactions).toHaveLength(1);
    state = financeReducer(state, { type: 'transaction/add', transaction: t }); // duplicate id ignored
    expect(state.transactions).toHaveLength(1);
    state = financeReducer(state, { type: 'transaction/update', transaction: { ...t, amount: 2000 } });
    expect(state.transactions[0]?.amount).toBe(2000);
    state = financeReducer(state, { type: 'transaction/delete', id: t.id });
    expect(state.transactions).toHaveLength(0);
  });

  it('sets, replaces and removes budgets', () => {
    let state = financeReducer(emptyData(), { type: 'budget/set', budget: { category: 'Transport', limit: 100, isDemo: false } });
    state = financeReducer(state, { type: 'budget/set', budget: { category: 'Transport', limit: 200, isDemo: false } });
    expect(state.budgets).toEqual([{ category: 'Transport', limit: 200, isDemo: false }]);
    state = financeReducer(state, { type: 'budget/remove', category: 'Transport' });
    expect(state.budgets).toHaveLength(0);
  });

  it('loads and clears demo data without touching user data', () => {
    const mine = tx('income', 50, 'Salary', '2026-11-01');
    let state = financeReducer(emptyData(), { type: 'transaction/add', transaction: mine });
    state = financeReducer(state, { type: 'budget/set', budget: { category: 'Transport', limit: 999, isDemo: false } });
    const demoTx = { ...tx('expense', 5, 'Transport', '2026-11-02'), isDemo: true };
    state = financeReducer(state, {
      type: 'demo/load',
      transactions: [demoTx],
      budgets: [{ category: 'Transport', limit: 1, isDemo: true }, { category: 'Shopping', limit: 2, isDemo: true }],
      goals: [{ ...goal('demo-g'), isDemo: true }],
    });
    expect(state.transactions).toHaveLength(2);
    expect(state.budgets.find((b) => b.category === 'Transport')?.limit).toBe(999); // user budget kept
    expect(hasDemoData(state)).toBe(true);

    expect(state.goals).toHaveLength(1);
    state = financeReducer(state, { type: 'demo/clear' });
    expect(state.goals).toHaveLength(0);
    expect(state.transactions).toEqual([mine]);
    expect(state.budgets).toEqual([{ category: 'Transport', limit: 999, isDemo: false }]);
    expect(hasDemoData(state)).toBe(false);
  });

  it('adds, adjusts, updates and deletes savings goals', () => {
    let state = financeReducer(emptyData(), { type: 'goal/add', goal: goal('g1') });
    state = financeReducer(state, { type: 'goal/adjust', id: 'g1', delta: 5000, at: 'y' });
    expect(state.goals[0]?.saved).toBe(25000);
    state = financeReducer(state, { type: 'goal/adjust', id: 'g1', delta: -999999, at: 'y' });
    expect(state.goals[0]?.saved).toBe(0); // never negative
    state = financeReducer(state, { type: 'goal/update', goal: { ...goal('g1'), name: 'Rent advance' } });
    expect(state.goals[0]?.name).toBe('Rent advance');
    state = financeReducer(state, { type: 'goal/delete', id: 'g1' });
    expect(state.goals).toHaveLength(0);
  });

  it('clears everything', () => {
    const state = financeReducer({ ...emptyData(), transactions: [tx('income', 1, 'Salary', '2026-11-01')] }, { type: 'data/clearAll' });
    expect(state).toEqual(emptyData());
  });
});
