import { describe, expect, it } from 'vitest';
import { createMemoryStore, DATA_KEY, emptyData, loadData, loadSettings, saveData, saveSettings, SETTINGS_KEY } from './storage';
import { tx } from './testUtils';

describe('storage', () => {
  it('reports empty storage', () => {
    expect(loadData(createMemoryStore()).status).toBe('empty');
  });

  it('round-trips valid data', () => {
    const store = createMemoryStore();
    const data = {
      ...emptyData(),
      transactions: [{ ...tx('income', 10, 'Salary', '2026-11-01'), method: 'bank' as const }],
      budgets: [{ category: 'Transport', limit: 5000, isDemo: false }],
      goals: [{ id: 'g', name: 'Emergency fund', target: 100000, saved: 0, deadline: '2027-06-30', isDemo: false, createdAt: 'x', updatedAt: 'x' }],
    };
    expect(saveData(store, data).ok).toBe(true);
    const loaded = loadData(store);
    expect(loaded.status).toBe('ok');
    expect(loaded.data).toEqual(data);
  });

  it('loads data saved by the earlier SwiftWise AI version (no goals, no payment methods)', () => {
    const legacy = JSON.stringify({ version: 1, transactions: [tx('expense', 25, 'Transport', '2026-10-03', 'Trotro')], budgets: [{ category: 'Transport', limit: 4000, isDemo: false }] });
    const result = loadData(createMemoryStore({ [DATA_KEY]: legacy }));
    expect(result.status).toBe('ok');
    expect(result.data.transactions).toHaveLength(1);
    expect(result.data.transactions[0]?.method).toBe(undefined);
    expect(result.data.goals).toEqual([]);
    expect(DATA_KEY).toBe('swiftwise:data:v1'); // unchanged so existing records are found
  });

  it('rejects invalid payment methods and goals', () => {
    const badMethod = JSON.stringify({ version: 1, transactions: [{ ...tx('expense', 5, 'Transport', '2026-10-03'), method: 'bitcoin' }], budgets: [] });
    expect(loadData(createMemoryStore({ [DATA_KEY]: badMethod })).status).toBe('corrupt');
    const badGoal = JSON.stringify({ version: 1, transactions: [], budgets: [], goals: [{ id: 'g', name: '', target: 0, saved: -1, deadline: 'soon' }] });
    expect(loadData(createMemoryStore({ [DATA_KEY]: badGoal })).status).toBe('corrupt');
  });

  it('detects corrupt JSON and invalid records without throwing', () => {
    expect(loadData(createMemoryStore({ [DATA_KEY]: '{not json' })).status).toBe('corrupt');
    const bad = JSON.stringify({ version: 1, transactions: [{ id: 'x', type: 'expense', amount: -5 }], budgets: [] });
    const result = loadData(createMemoryStore({ [DATA_KEY]: bad }));
    expect(result.status).toBe('corrupt');
    if (result.status === 'corrupt') expect(result.error).toContain('failed validation');
    const wrongVersion = JSON.stringify({ version: 2, transactions: [], budgets: [] });
    expect(loadData(createMemoryStore({ [DATA_KEY]: wrongVersion })).status).toBe('corrupt');
  });

  it('rejects fractional pesewas and unknown categories', () => {
    const t = { ...tx('expense', 10, 'Transport', '2026-11-01'), amount: 10.5 };
    const u = { ...tx('expense', 10, 'Transport', '2026-11-01'), category: 'Casino' };
    for (const record of [t, u]) {
      const raw = JSON.stringify({ version: 1, transactions: [record], budgets: [] });
      expect(loadData(createMemoryStore({ [DATA_KEY]: raw })).status).toBe('corrupt');
    }
  });

  it('reports storage write failures', () => {
    const failing = { getItem: () => null, removeItem: () => undefined, setItem: () => { throw new Error('QuotaExceededError'); } };
    const result = saveData(failing, emptyData());
    expect(result.ok).toBe(false);
  });

  it('loads settings with safe defaults', () => {
    const store = createMemoryStore({ [SETTINGS_KEY]: '{"theme":"neon","aiConsent":"yes"}' });
    expect(loadSettings(store, 'light')).toEqual({ theme: 'light', aiConsent: false });
    saveSettings(store, { theme: 'dark', aiConsent: true });
    expect(loadSettings(store, 'light')).toEqual({ theme: 'dark', aiConsent: true });
  });
});
