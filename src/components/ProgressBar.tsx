import type { BudgetState } from '../lib/finance';

/** Accessible progress bar; the fill is capped at 100% but the label shows the real value. */
export function ProgressBar({ ratio, state, label }: { ratio: number; state: BudgetState; label: string }) {
  const percent = Math.round(ratio * 100);
  return (
    <div
      className={`progress progress--${state}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(percent, 100)}
      aria-valuetext={`${percent}% used`}
    >
      <div className="progress__fill" style={{ width: `${Math.min(percent, 100)}%` }} />
    </div>
  );
}
