import { Pressable } from 'react-native';
import { Eye, Pencil, Trash2 } from 'lucide-react-native';

type Kind = 'edit' | 'delete' | 'view';

export function NativeActionButton({ kind, label, onPress }: { kind: Kind; label: string; onPress: () => void }) {
  const Icon = kind === 'edit' ? Pencil : kind === 'delete' ? Trash2 : Eye;
  return (
    <Pressable accessibilityLabel={label} onPress={onPress}>
      <Icon color={kind === 'delete' ? '#fca5a5' : '#cbd5e1'} size={18} />
    </Pressable>
  );
}
