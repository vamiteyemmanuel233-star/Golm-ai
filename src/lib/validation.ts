import type { PaymentMethod, TransactionType } from '../types/finance';
import { isValidCategory } from './categories';
import { isValidISODate } from './dates';
import { parseCediInput } from './money';
import { isPaymentMethod } from './paymentMethods';

export const DESCRIPTION_MAX = 120;
export const EARLIEST_DATE = '2000-01-01';

export interface TransactionInput {
  type: TransactionType;
  amount: string;
  category: string;
  date: string;
  description: string;
  /** '' until the user chooses */
  method: PaymentMethod | '';
}

export type TransactionErrors = Partial<Record<keyof TransactionInput, string>>;

export interface ValidTransaction {
  type: TransactionType;
  amount: number;
  category: string;
  date: string;
  description: string;
  method: PaymentMethod;
}

export type ValidationResult =
  | { ok: true; value: ValidTransaction }
  | { ok: false; errors: TransactionErrors };

/** Validates the transaction form. `today` is passed in so tests are deterministic. */
export function validateTransaction(input: TransactionInput, today: string): ValidationResult {
  const errors: TransactionErrors = {};

  if (input.type !== 'income' && input.type !== 'expense') {
    errors.type = 'Choose income or expense.';
  }

  const amount = parseCediInput(input.amount);
  if (!amount.ok) errors.amount = amount.error;

  if (!input.category) errors.category = 'Choose a category.';
  else if (!errors.type && !isValidCategory(input.type, input.category)) {
    errors.category = `“${input.category}” is not a valid ${input.type} category.`;
  }

  if (!input.date) errors.date = 'Choose a date.';
  else if (!isValidISODate(input.date)) errors.date = 'Enter a real calendar date.';
  else if (input.date > today) errors.date = 'The date cannot be in the future.';
  else if (input.date < EARLIEST_DATE) errors.date = 'The date must be in the year 2000 or later.';

  if (!isPaymentMethod(input.method)) errors.method = 'Choose how the money was paid or received.';

  const description = input.description.trim().replace(/\s+/g, ' ');
  if (description.length > DESCRIPTION_MAX) {
    errors.description = `Keep the description under ${DESCRIPTION_MAX} characters.`;
  }

  if (Object.keys(errors).length > 0 || !amount.ok || !isPaymentMethod(input.method)) return { ok: false, errors };
  return {
    ok: true,
    value: { type: input.type, amount: amount.value, category: input.category, date: input.date, description, method: input.method },
  };
}

export function validateBudgetAmount(raw: string): { ok: true; value: number } | { ok: false; error: string } {
  return parseCediInput(raw);
}
