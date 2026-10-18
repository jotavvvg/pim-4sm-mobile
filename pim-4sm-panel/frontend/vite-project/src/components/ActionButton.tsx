import { Eye, Pencil, Trash2 } from 'lucide-react';

type ActionButtonProps = {
  kind: 'edit' | 'delete' | 'view';
  label: string;
  onClick: () => void;
};

export function ActionButton({ kind, label, onClick }: ActionButtonProps) {
  const icon = (() => {
    switch (kind) {
      case 'edit':
        return <Pencil aria-hidden="true" />;
      case 'delete':
        return <Trash2 aria-hidden="true" />;
      default:
        return <Eye aria-hidden="true" />;
    }
  })();

  return (
    <button type="button" className={`icon-button ${kind}`} onClick={onClick} aria-label={label} title={label}>
      {icon}
    </button>
  );
}
