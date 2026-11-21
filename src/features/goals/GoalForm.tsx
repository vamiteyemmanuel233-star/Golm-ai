import { useId, useState, type FormEvent } from 'react';
import { currencyLabel } from '../../lib/currency';
import { Button } from '../../components/Button';
import { describedBy, Field } from '../../components/Field';
import { GOAL_NAME_MAX, validateGoal, type GoalErrors, type GoalInput } from '../../lib/goals';
import { formatCedi, parseCediInput, pesewasToDecimalString } from '../../lib/money';
import type { SavingsGoal } from '../../types/finance';

interface GoalFormProps {
  initial: SavingsGoal | null;
  preset?: { name: string; target: number };
  today: string;
  onSubmit: (value: { name: string; target: number; saved: number; deadline: string | null }) => void;
  onCancel: () => void;
}

export function GoalForm({ initial, preset, today, onSubmit, onCancel }: GoalFormProps) {
  const id = useId();
  const [values, setValues] = useState<GoalInput>(() => ({
    name: initial?.name ?? preset?.name ?? '',
    target: initial ? pesewasToDecimalString(initial.target) : preset ? pesewasToDecimalString(preset.target) : '',
    saved: initial ? pesewasToDecimalString(initial.saved) : '',
    deadline: initial?.deadline ?? '',
  }));
  const [errors, setErrors] = useState<GoalErrors>({});

  const set = (key: keyof GoalInput, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = validateGoal(values, today);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    onSubmit(result.value);
  };

  const f = (name: string) => `${id}-${name}`;
  const savedHint = 'Money you have already set aside, if any.';
  const dateHint = 'Optional. GOLM AI will work out how much to save each month.';

  return (
    <form className="form" onSubmit={submit} noValidate>
      <Field id={f('name')} label="Goal name" error={errors.name}>
        <input
          id={f('name')}
          className="input"
          maxLength={GOAL_NAME_MAX + 10}
          placeholder="e.g. Emergency fund, School fees, Rent advance"
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={describedBy(f('name'), errors.name)}
          autoFocus
        />
      </Field>
      <div className="form-grid">
        <Field id={f('target')} label={`Target amount (${currencyLabel()})`} error={errors.target}>
          <div className="input-prefix">
            <span aria-hidden="true">{currencyLabel()}</span>
            <input id={f('target')} className="input" inputMode="decimal" placeholder="0.00" value={values.target} onChange={(e) => set('target', e.target.value)} aria-invalid={errors.target ? true : undefined} aria-describedby={describedBy(f('target'), errors.target)} />
          </div>
        </Field>
        <Field id={f('saved')} label={`Already saved (${currencyLabel()})`} optional error={errors.saved} hint={savedHint}>
          <div className="input-prefix">
            <span aria-hidden="true">{currencyLabel()}</span>
            <input id={f('saved')} className="input" inputMode="decimal" placeholder="0.00" value={values.saved} onChange={(e) => set('saved', e.target.value)} aria-invalid={errors.saved ? true : undefined} aria-describedby={describedBy(f('saved'), errors.saved, savedHint)} />
          </div>
        </Field>
      </div>
      <Field id={f('deadline')} label="Target date" optional error={errors.deadline} hint={dateHint}>
        <input id={f('deadline')} type="date" className="input" min={today} value={values.deadline} onChange={(e) => set('deadline', e.target.value)} aria-invalid={errors.deadline ? true : undefined} aria-describedby={describedBy(f('deadline'), errors.deadline, dateHint)} />
      </Field>
      <div className="form-actions">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{initial ? 'Save goal' : 'Create goal'}</Button>
      </div>
    </form>
  );
}

/** Add money to, or withdraw money from, a goal. */
export function GoalMoneyForm({ mode, max, onSubmit, onCancel }: { mode: 'add' | 'withdraw'; max: number; onSubmit: (amount: number) => void; onCancel: () => void }) {
  const id = useId();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseCediInput(amount);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    if (mode === 'withdraw' && parsed.value > max) {
      setError(`You can withdraw at most ${formatCedi(max)}.`);
      return;
    }
    onSubmit(parsed.value);
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      <Field id={`${id}-amt`} label={mode === 'add' ? `Amount to add (${currencyLabel()})` : `Amount to withdraw (${currencyLabel()})`} error={error}>
        <div className="input-prefix">
          <span aria-hidden="true">{currencyLabel()}</span>
          <input id={`${id}-amt`} className="input" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => { setAmount(e.target.value); setError(''); }} aria-invalid={error ? true : undefined} aria-describedby={describedBy(`${id}-amt`, error)} autoFocus />
        </div>
      </Field>
      <div className="form-actions">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{mode === 'add' ? 'Add money' : 'Withdraw'}</Button>
      </div>
    </form>
  );
}
