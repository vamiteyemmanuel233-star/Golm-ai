import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  /** Shows a spinner and disables the button */
  loading?: boolean;
  children?: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', icon: Icon, loading = false, children, className = '', type = 'button', disabled, ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={`btn btn--${variant} btn--${size} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="spinner" aria-hidden="true" /> : Icon ? <Icon size={size === 'sm' ? 16 : 18} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

/** Square icon-only button. `label` is required so screen readers can announce it. */
export function IconButton({ icon: Icon, label, className = '', ...rest }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & { icon: LucideIcon; label: string }) {
  return (
    <button type="button" className={`icon-btn ${className}`.trim()} aria-label={label} title={label} {...rest}>
      <Icon size={18} aria-hidden="true" />
    </button>
  );
}

/** A link styled like a button (for navigation). */
export function ButtonLink({ href, icon: Icon, variant = 'secondary', size = 'md', children }: { href: string; icon?: LucideIcon; variant?: Variant; size?: Size; children: ReactNode }) {
  return (
    <a href={href} className={`btn btn--${variant} btn--${size}`}>
      {Icon ? <Icon size={size === 'sm' ? 16 : 18} aria-hidden="true" /> : null}
      {children}
    </a>
  );
}
