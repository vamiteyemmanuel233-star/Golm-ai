/**
 * Core data types for GOLM AI.
 *
 * MONEY RULE: every amount is stored as an integer number of PESEWAS
 * (GH₵1.00 = 100 pesewas). Integers avoid floating-point errors such as
 * 0.1 + 0.2 = 0.30000000000000004, which would make totals look wrong.
 */

export type TransactionType = 'income' | 'expense';

/** How the money moved. Optional so records saved before this field existed still load. */
export type PaymentMethod = 'momo' | 'cash' | 'bank' | 'card';

export interface Transaction {
  id: string;
  type: TransactionType;
  /** Positive integer, in pesewas. The `type` decides whether it adds or subtracts. */
  amount: number;
  category: string;
  description: string;
  /** Calendar date in ISO format: YYYY-MM-DD */
  date: string;
  /** Mobile Money, cash, bank or card. Missing on older records. */
  method?: PaymentMethod;
  /** True for generated demonstration data, so it is never mistaken for real records. */
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  /** An expense category */
  category: string;
  /** Monthly limit in pesewas */
  limit: number;
  isDemo: boolean;
}

/** Money the user is setting aside for a purpose, e.g. an emergency fund or school fees. */
export interface SavingsGoal {
  id: string;
  name: string;
  /** Target amount in pesewas */
  target: number;
  /** Amount saved so far in pesewas (0 or more) */
  saved: number;
  /** Optional target date YYYY-MM-DD */
  deadline: string | null;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceData {
  version: 1;
  transactions: Transaction[];
  budgets: Budget[];
  /** Added in GOLM AI. Data saved earlier has no goals list; it loads as []. */
  goals: SavingsGoal[];
}

export type Theme = 'light' | 'dark';

export interface Settings {
  theme: Theme;
  /** True only after the user picks a theme themselves. Until then GOLM AI opens in light mode. */
  themeChosen: boolean;
  /** The user explicitly agreed to send a summary of their data to the AI provider. */
  aiConsent: boolean;
}

/** Month key in the form YYYY-MM */
export type MonthKey = string;
