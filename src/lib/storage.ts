/**
 * localStorage persistence with validation.
 * The app treats stored data as untrusted: anything that fails validation is
 * reported as "corrupt" instead of crashing the interface.
 */
import type { Budget, FinanceData, SavingsGoal, Settings, Theme, Transaction } from '../types/finance';
import { isValidCategory } from './categories';
import { isValidISODate } from './dates';
import { MAX_AMOUNT_PESEWAS } from './money';
import { isPaymentMethod } from './paymentMethods';

// These keys come from the app's earlier name (SwiftWise AI). They are kept
// unchanged on purpose: renaming them would make existing records disappear.
// Users never see them.
export const DATA_KEY = 'swiftwise:data:v1';
export const SETTINGS_KEY = 'swiftwise:settings:v1';

/** The subset of the Storage API we use — lets tests pass an in-memory store. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function emptyData(): FinanceData {
  return { version: 1, transactions: [], budgets: [], goals: [] };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= MAX_AMOUNT_PESEWAS;
}

export function isTransaction(value: unknown): value is Transaction {
  if (!isObject(value)) return false;
  const { id, type, amount, category, description, date, method, isDemo, createdAt, updatedAt } = value;
  return (
    (method === undefined || isPaymentMethod(method)) &&
    typeof id === 'string' && id.length > 0 &&
    (type === 'income' || type === 'expense') &&
    isValidAmount(amount) &&
    typeof category === 'string' && isValidCategory(type, category) &&
    typeof description === 'string' && description.length <= 500 &&
    typeof date === 'string' && isValidISODate(date) &&
    typeof isDemo === 'boolean' &&
    typeof createdAt === 'string' &&
    typeof updatedAt === 'string'
  );
}

export function isBudget(value: unknown): value is Budget {
  if (!isObject(value)) return false;
  const { category, limit, isDemo } = value;
  return (
    typeof category === 'string' && isValidCategory('expense', category) &&
    isValidAmount(limit) &&
    typeof isDemo === 'boolean'
  );
}

export function isSavingsGoal(value: unknown): value is SavingsGoal {
  if (!isObject(value)) return false;
  const { id, name, target, saved, deadline, isDemo, createdAt, updatedAt } = value;
  return (
    typeof id === 'string' && id.length > 0 &&
    typeof name === 'string' && name.trim().length > 0 && name.length <= 80 &&
    isValidAmount(target) &&
    typeof saved === 'number' && Number.isInteger(saved) && saved >= 0 && saved <= MAX_AMOUNT_PESEWAS &&
    (deadline === null || (typeof deadline === 'string' && isValidISODate(deadline))) &&
    typeof isDemo === 'boolean' &&
    typeof createdAt === 'string' &&
    typeof updatedAt === 'string'
  );
}

export type LoadResult =
  | { status: 'empty'; data: FinanceData }
  | { status: 'ok'; data: FinanceData }
  | { status: 'corrupt'; data: FinanceData; raw: string; error: string };

export function parseData(raw: string): { ok: true; data: FinanceData } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'Saved data is not valid JSON.' };
  }
  if (!isObject(parsed)) return { ok: false, error: 'Saved data has an unexpected shape.' };
  if (parsed.version !== 1) return { ok: false, error: `Unsupported data version: ${String(parsed.version)}.` };
  const { transactions, budgets } = parsed;
  // Data saved before savings goals existed has no `goals` field: treat as empty.
  const goals = parsed.goals === undefined ? [] : parsed.goals;
  if (!Array.isArray(goals)) return { ok: false, error: 'Saved savings goals have an unexpected shape.' };
  const badGoals = goals.filter((g) => !isSavingsGoal(g)).length;
  if (badGoals > 0) return { ok: false, error: `${badGoals} saved goal(s) failed validation.` };
  if (!Array.isArray(transactions) || !Array.isArray(budgets)) {
    return { ok: false, error: 'Saved data is missing its transaction or budget list.' };
  }
  const badTx = transactions.filter((t) => !isTransaction(t)).length;
  if (badTx > 0) return { ok: false, error: `${badTx} saved transaction(s) failed validation.` };
  const badBudgets = budgets.filter((b) => !isBudget(b)).length;
  if (badBudgets > 0) return { ok: false, error: `${badBudgets} saved budget(s) failed validation.` };
  const ids = new Set(transactions.map((t: Transaction) => t.id));
  if (ids.size !== transactions.length) return { ok: false, error: 'Saved data contains duplicate transaction IDs.' };
  const budgetCats = new Set(budgets.map((b: Budget) => b.category));
  if (budgetCats.size !== budgets.length) return { ok: false, error: 'Saved data contains duplicate budgets.' };
  return { ok: true, data: { version: 1, transactions: transactions as Transaction[], budgets: budgets as Budget[], goals: goals as SavingsGoal[] } };
}

export function loadData(store: KeyValueStore): LoadResult {
  let raw: string | null;
  try {
    raw = store.getItem(DATA_KEY);
  } catch {
    return { status: 'corrupt', data: emptyData(), raw: '', error: 'Browser storage is not available (it may be blocked or in private mode).' };
  }
  if (raw === null) return { status: 'empty', data: emptyData() };
  const result = parseData(raw);
  if (!result.ok) return { status: 'corrupt', data: emptyData(), raw, error: result.error };
  return { status: 'ok', data: result.data };
}

export function saveData(store: KeyValueStore, data: FinanceData): { ok: true } | { ok: false; error: string } {
  try {
    store.setItem(DATA_KEY, JSON.stringify(data));
    return { ok: true };
  } catch (error) {
    const quota = error instanceof Error && /quota/i.test(error.name + error.message);
    return {
      ok: false,
      error: quota
        ? 'Browser storage is full. Export your data to CSV, then remove old transactions.'
        : 'Your changes could not be saved to this browser.',
    };
  }
}

/** GOLM AI opens in light (white) mode unless the user has chosen another theme. */
export const DEFAULT_THEME: Theme = 'light';

export function loadSettings(store: KeyValueStore): Settings {
  const defaults: Settings = { theme: DEFAULT_THEME, themeChosen: false, aiConsent: false };
  try {
    const raw = store.getItem(SETTINGS_KEY);
    if (!raw) return defaults;
    const parsed: unknown = JSON.parse(raw);
    if (!isObject(parsed)) return defaults;
    // Earlier versions saved the device's theme automatically, without the user
    // choosing it. Only a theme the user picked themselves (themeChosen) is kept.
    const chosen = parsed.themeChosen === true && (parsed.theme === 'dark' || parsed.theme === 'light');
    return {
      theme: chosen ? (parsed.theme as Theme) : DEFAULT_THEME,
      themeChosen: chosen,
      aiConsent: parsed.aiConsent === true,
    };
  } catch {
    return defaults;
  }
}

export function saveSettings(store: KeyValueStore, settings: Settings): void {
  try {
    store.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Settings are a convenience; failing to save them is not fatal.
  }
}

/** An in-memory store used by tests and as a fallback when localStorage is blocked. */
export function createMemoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

/** Returns window.localStorage if usable, otherwise an in-memory fallback. */
export function getBrowserStore(): { store: KeyValueStore; persistent: boolean } {
  try {
    const probe = '__golm_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return { store: window.localStorage, persistent: true };
  } catch {
    return { store: createMemoryStore(), persistent: false };
  }
}
