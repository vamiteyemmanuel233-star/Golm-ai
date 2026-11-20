import type { ReactNode } from 'react';

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  optional?: boolean;
}

/** Label + control + hint/error, wired together with aria-describedby by the caller via `describedBy()`. */
export function Field({ id, label, error, hint, children, optional }: FieldProps) {
  return (
    <div className={`field ${error ? 'field--error' : ''}`.trim()}>
      <label htmlFor={id} className="field__label">
        {label}
        {optional ? <span className="field__optional"> (optional)</span> : null}
      </label>
      {children}
      {hint && !error ? <p id={`${id}-hint`} className="field__hint">{hint}</p> : null}
      {error ? (
        <p id={`${id}-error`} className="field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function describedBy(id: string, error?: string, hint?: string): string | undefined {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}
