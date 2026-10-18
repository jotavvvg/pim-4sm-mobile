import { CircleDashed } from 'lucide-react';

type EmptyStateProps = {
  title: string;
  description?: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="empty-state-box" role="status" aria-live="polite">
      <div className="empty-state-icon" aria-hidden="true">
        <CircleDashed />
      </div>
      <h4>{title}</h4>
      {description ? <p>{description}</p> : null}
    </div>
  );
}
