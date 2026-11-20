import { useId, useState, type FormEvent } from 'react';
import { Button } from '../../components/Button';
import { describedBy, Field } from '../../components/Field';
import { pesewasToDecimalString } from '../../lib/money';
import { validateBudgetAmount } from '../../lib/validation';

interface BudgetFormProps {
  /** Categories that can be chosen (for a new budget) */
  categories: readonly string[];
  /** When editing, the fixed category and current limit */
  editing: { category: string; limit: number } | null;
  /** Pre-selected category for a new budget */
  presetCategory?: string;
  onSubmit: (category: string, limit: number) => void;
  onCancel: () => void;
}

export function BudgetForm({ categories, editing, presetCategory, onSubmit, onCancel }: BudgetFormProps) {
  const id = useId();
  const [category, setCategory] = useState(editing?.category ?? presetCategory ?? '');
  const [amount, setAmount] = useState(editing ? pesewasToDecimalString(editing.limit) : '');
  const [errors, setErrors] = useState<{ category?: string; amount?: string }>({});

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: { category?: string; amount?: string } = {};
    if (!category) next.category = 'Choose a category.';
    const parsed = validateBudgetAmount(amount);
    if (!parsed.ok) next.amount = parsed.error;
    setErrors(next);
    if (next.category || !parsed.ok) return;
    onSubmit(category, parsed.value);
  };

  const hint = 'The most you plan to spend in this category each month.';

  return (
    <form className="form" onSubmit={submit} noValidate>
      <Field id={`${id}-cat`} label="Expense category" error={errors.category}>
        <select
          id={`${id}-cat`}
          className="input"
          value={category}
          disabled={editing !== null}
          onChange={(e) => setCategory(e.target.value)}
          aria-invalid={errors.category ? true : undefined}
          aria-describedby={describedBy(`${id}-cat`, errors.category)}
        >
          {editing ? <option value={editing.category}>{editing.category}</option> : <option value="">Select a category…</option>}
          {!editing && categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
      <Field id={`${id}-amt`} label="Monthly limit (GH₵)" error={errors.amount} hint={hint}>
        <div className="input-prefix">
          <span aria-hidden="true">GH₵</span>
          <input
            id={`${id}-amt`}
            className="input"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={errors.amount ? true : undefined}
            aria-describedby={describedBy(`${id}-amt`, errors.amount, hint)}
            autoFocus
          />
        </div>
      </Field>
      <div className="form-actions">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{editing ? 'Save budget' : 'Create budget'}</Button>
      </div>
    </form>
  );
}
