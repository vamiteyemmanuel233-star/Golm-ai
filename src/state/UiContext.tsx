import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { MonthKey, Transaction } from '../types/finance';
import { monthKeyOf } from '../lib/dates';
import { useFinance } from './FinanceContext';

type FormState = { open: false } | { open: true; editing: Transaction | null };

interface UiContextValue {
  /** The month the dashboard, budgets and insights are showing */
  month: MonthKey;
  setMonth: (month: MonthKey) => void;
  form: FormState;
  openNewTransaction: () => void;
  openEditTransaction: (transaction: Transaction) => void;
  closeTransactionForm: () => void;
}

const UiContext = createContext<UiContextValue | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const { today } = useFinance();
  const [month, setMonth] = useState<MonthKey>(() => monthKeyOf(today));
  const [form, setForm] = useState<FormState>({ open: false });

  const value = useMemo<UiContextValue>(
    () => ({
      month,
      setMonth,
      form,
      openNewTransaction: () => setForm({ open: true, editing: null }),
      openEditTransaction: (transaction) => setForm({ open: true, editing: transaction }),
      closeTransactionForm: () => setForm({ open: false }),
    }),
    [month, form],
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi(): UiContextValue {
  const context = useContext(UiContext);
  if (!context) throw new Error('useUi must be used inside <UiProvider>');
  return context;
}
