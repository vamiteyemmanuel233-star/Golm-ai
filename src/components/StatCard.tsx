import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: 'blue' | 'green' | 'red' | 'navy';
  /** Small line under the value, e.g. "12% vs Oct" */
  footnote?: string;
  footnoteTone?: 'good' | 'bad' | 'neutral';
}

export function StatCard({ label, value, icon: Icon, tone, footnote, footnoteTone = 'neutral' }: StatCardProps) {
  return (
    <article className={`stat stat--${tone}`}>
      <div className="stat__top">
        <span className="stat__label">{label}</span>
        <span className="stat__icon" aria-hidden="true">
          <Icon size={18} />
        </span>
      </div>
      <p className="stat__value">{value}</p>
      {footnote ? <p className={`stat__foot stat__foot--${footnoteTone}`}>{footnote}</p> : null}
    </article>
  );
}
