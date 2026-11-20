import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import type { FinanceData, SavingsGoal, Transaction } from '../types/finance';
import { generateDemoData } from '../lib/demoData';
import { todayISO } from '../lib/dates';
import { createId } from '../lib/id';
import { emptyData, getBrowserStore, loadData, saveData, type LoadResult } from '../lib/storage';
import type { ValidTransaction } from '../lib/validation';
import { financeReducer, hasDemoData } from './reducer';

interface FinanceContextValue {
  data: FinanceData;
  today: string;
  hasDemo: boolean;
  /** false when the browser blocks localStorage (data lasts only for this tab) */
  persistent: boolean;
  /** Set when saved data failed validation; the app shows a recovery screen */
  corrupt: { error: string; raw: string } | null;
  saveError: string | null;
  addTransaction: (input: ValidTransaction) => Transaction;
  updateTransaction: (id: string, input: ValidTransaction) => void;
  deleteTransaction: (id: string) => void;
  setBudget: (category: string, limit: number) => void;
  removeBudget: (category: string) => void;
  addGoal: (input: Pick<SavingsGoal, 'name' | 'target' | 'saved' | 'deadline'>) => void;
  updateGoal: (id: string, input: Pick<SavingsGoal, 'name' | 'target' | 'saved' | 'deadline'>) => void;
  deleteGoal: (id: string) => void;
  /** positive = money added, negative = money withdrawn */
  adjustGoal: (id: string, delta: number) => void;
  loadDemo: () => void;
  clearDemo: () => void;
  clearAll: () => void;
  /** Discards unreadable saved data and starts fresh */
  resetCorrupt: () => void;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  // Read storage once, synchronously, before the first render.
  const [{ store, persistent }] = useState(getBrowserStore);
  const [initial] = useState<LoadResult>(() => loadData(store));
  const [data, dispatch] = useReducer(financeReducer, initial.data);
  const [corrupt, setCorrupt] = useState(initial.status === 'corrupt' ? { error: initial.error, raw: initial.raw } : null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [today] = useState(todayISO);
  const lastSaved = useRef(initial.data);

  // Persist after every change. Skipped while corrupt so we never overwrite
  // the user's unreadable data before they decide what to do with it.
  useEffect(() => {
    if (data === lastSaved.current || corrupt) return;
    lastSaved.current = data;
    const result = saveData(store, data);
    setSaveError(result.ok ? null : result.error);
  }, [data, store, corrupt]);

  const addTransaction = useCallback((input: ValidTransaction): Transaction => {
    const now = new Date().toISOString();
    const transaction: Transaction = { ...input, id: createId(), isDemo: false, createdAt: now, updatedAt: now };
    dispatch({ type: 'transaction/add', transaction });
    return transaction;
  }, []);

  const updateTransaction = useCallback(
    (id: string, input: ValidTransaction) => {
      const existing = data.transactions.find((t) => t.id === id);
      if (!existing) return;
      dispatch({ type: 'transaction/update', transaction: { ...existing, ...input, updatedAt: new Date().toISOString() } });
    },
    [data.transactions],
  );

  const value = useMemo<FinanceContextValue>(
    () => ({
      data,
      today,
      hasDemo: hasDemoData(data),
      persistent,
      corrupt,
      saveError,
      addTransaction,
      updateTransaction,
      deleteTransaction: (id) => dispatch({ type: 'transaction/delete', id }),
      // A budget the user sets (or a demo budget they edit) becomes their own.
      setBudget: (category, limit) => dispatch({ type: 'budget/set', budget: { category, limit, isDemo: false } }),
      removeBudget: (category) => dispatch({ type: 'budget/remove', category }),
      addGoal: (input) => {
        const now = new Date().toISOString();
        dispatch({ type: 'goal/add', goal: { ...input, id: createId(), isDemo: false, createdAt: now, updatedAt: now } });
      },
      updateGoal: (id, input) => {
        const existing = data.goals.find((g) => g.id === id);
        if (!existing) return;
        dispatch({ type: 'goal/update', goal: { ...existing, ...input, isDemo: false, updatedAt: new Date().toISOString() } });
      },
      deleteGoal: (id) => dispatch({ type: 'goal/delete', id }),
      adjustGoal: (id, delta) => dispatch({ type: 'goal/adjust', id, delta, at: new Date().toISOString() }),
      loadDemo: () => {
        const demo = generateDemoData(today);
        dispatch({ type: 'demo/load', transactions: demo.transactions, budgets: demo.budgets, goals: demo.goals });
      },
      clearDemo: () => dispatch({ type: 'demo/clear' }),
      clearAll: () => dispatch({ type: 'data/clearAll' }),
      resetCorrupt: () => {
        setCorrupt(null);
        dispatch({ type: 'data/replace', data: emptyData() });
        const result = saveData(store, emptyData());
        setSaveError(result.ok ? null : result.error);
      },
    }),
    [data, today, persistent, corrupt, saveError, addTransaction, updateTransaction, store],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance(): FinanceContextValue {
  const context = useContext(FinanceContext);
  if (!context) throw new Error('useFinance must be used inside <FinanceProvider>');
  return context;
}
