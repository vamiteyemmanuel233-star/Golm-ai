import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export function EmptyState({ icon: Icon, title, message, children }: { icon: LucideIcon; title: string; message: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty__icon" aria-hidden="true">
        <Icon size={26} />
      </span>
      <h3 className="empty__title">{title}</h3>
      <p className="empty__message">{message}</p>
      {children ? <div className="empty__actions">{children}</div> : null}
    </div>
  );
}
