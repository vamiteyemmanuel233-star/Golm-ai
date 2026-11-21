import { useId, useRef, useState, type FormEvent } from 'react';
import { currencyLabel } from '../../lib/currency';
import { ArrowDownLeft, ArrowUpRight, Banknote, CreditCard, Landmark, Smartphone, type LucideIcon } from 'lucide-react';
import type { PaymentMethod, Transaction, TransactionType } from '../../types/finance';
import { PAYMENT_METHODS } from '../../lib/paymentMethods';
import { categoriesFor, isValidCategory } from '../../lib/categories';
import { pesewasToDecimalString } from '../../lib/money';
import { DESCRIPTION_MAX, EARLIEST_DATE, validateTransaction, type TransactionErrors, type TransactionInput, type ValidTransaction } from '../../lib/validation';
import { Button } from '../../components/Button';
import { describedBy, Field } from '../../components/Field';

interface TransactionFormProps {
  initial: Transaction | null;
  today: string;
  onSubmit: (value: ValidTransaction) => void;
  onCancel: () => void;
}

const FIELD_ORDER: (keyof TransactionInput)[] = ['type', 'amount', 'category', 'date', 'method', 'description'];

const METHOD_ICONS: Record<PaymentMethod, LucideIcon> = { momo: Smartphone, cash: Banknote, bank: Landmark, card: CreditCard };

export function TransactionForm({ initial, today, onSubmit, onCancel }: TransactionFormProps) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<TransactionInput>(() =>
    initial
      ? {
          type: initial.type,
          amount: pesewasToDecimalString(initial.amount),
          category: initial.category,
          date: initial.date,
          description: initial.description,
          // Older records have no method; the user picks one when editing.
          method: initial.method ?? '',
        }
      : { type: 'expense', amount: '', category: '', date: today, description: '', method: 'momo' },
  );
  const [errors, setErrors] = useState<TransactionErrors>({});

  const update = <K extends keyof TransactionInput>(key: K, value: TransactionInput[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const changeType = (type: TransactionType) => {
    setValues((v) => ({ ...v, type, category: isValidCategory(type, v.category) ? v.category : '' }));
    setErrors((e) => ({ ...e, type: undefined, category: undefined }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const result = validateTransaction(values, today);
    if (!result.ok) {
      setErrors(result.errors);
      // Move focus to the first invalid field so keyboard users find the problem.
      const first = FIELD_ORDER.find((key) => result.errors[key]);
      if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    onSubmit(result.value);
  };

  const fid = (name: string) => `${id}-${name}`;

  return (
    <form ref={formRef} className="form" onSubmit={handleSubmit} noValidate>
      <fieldset className="segmented" aria-describedby={errors.type ? fid('type-error') : undefined}>
        <legend className="field__label">Type</legend>
        {(['expense', 'income'] as const).map((type) => (
          <label key={type} className={`segmented__option segmented__option--${type} ${values.type === type ? 'is-active' : ''}`}>
            <input type="radio" name="type" value={type} checked={values.type === type} onChange={() => changeType(type)} />
            {type === 'expense' ? <ArrowUpRight size={16} aria-hidden="true" /> : <ArrowDownLeft size={16} aria-hidden="true" />}
            {type === 'expense' ? 'Expense' : 'Income'}
          </label>
        ))}
      </fieldset>

      <div className="form-grid">
        <Field id={fid('amount')} label={`Amount (${currencyLabel()})`} error={errors.amount} hint="Up to 2 decimal places">
          <div className="input-prefix">
            <span aria-hidden="true">{currencyLabel()}</span>
            <input
              id={fid('amount')}
              name="amount"
              className="input"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={values.amount}
              onChange={(e) => update('amount', e.target.value)}
              aria-invalid={errors.amount ? true : undefined}
              aria-describedby={describedBy(fid('amount'), errors.amount, 'Up to 2 decimal places')}
              autoFocus
            />
          </div>
        </Field>

        <Field id={fid('date')} label="Date" error={errors.date}>
          <input
            id={fid('date')}
            name="date"
            type="date"
            className="input"
            min={EARLIEST_DATE}
            max={today}
            value={values.date}
            onChange={(e) => update('date', e.target.value)}
            aria-invalid={errors.date ? true : undefined}
            aria-describedby={describedBy(fid('date'), errors.date)}
          />
        </Field>
      </div>

      <Field id={fid('category')} label="Category" error={errors.category}>
        <select
          id={fid('category')}
          name="category"
          className="input"
          value={values.category}
          onChange={(e) => update('category', e.target.value)}
          aria-invalid={errors.category ? true : undefined}
          aria-describedby={describedBy(fid('category'), errors.category)}
        >
          <option value="">Select a category…</option>
          {categoriesFor(values.type).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <fieldset className="segmented segmented--methods" aria-describedby={errors.method ? fid('method-error') : undefined}>
        <legend className="field__label">{values.type === 'income' ? 'Received by' : 'Paid with'}</legend>
        {PAYMENT_METHODS.map((m) => {
          const Icon = METHOD_ICONS[m.id];
          return (
            <label key={m.id} className={`segmented__option ${values.method === m.id ? 'is-active' : ''}`}>
              <input type="radio" name="method" value={m.id} checked={values.method === m.id} onChange={() => update('method', m.id)} />
              <Icon size={16} aria-hidden="true" />
              {m.label}
            </label>
          );
        })}
      </fieldset>
      {errors.method ? <p id={fid('method-error')} className="field__error" role="alert">{errors.method}</p> : null}

      <Field id={fid('description')} label="Description" optional error={errors.description} hint={`${values.description.length}/${DESCRIPTION_MAX} characters`}>
        <input
          id={fid('description')}
          name="description"
          className="input"
          maxLength={DESCRIPTION_MAX + 20}
          placeholder={values.type === 'expense' ? 'e.g. Weekly groceries' : 'e.g. November salary'}
          value={values.description}
          onChange={(e) => update('description', e.target.value)}
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={describedBy(fid('description'), errors.description, 'count')}
        />
      </Field>

      <div className="form-actions">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{initial ? 'Save changes' : 'Add transaction'}</Button>
      </div>
    </form>
  );
}
