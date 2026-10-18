import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Eye, Pencil, Trash2 } from 'lucide-react-native';

export type NativeTableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => string;
  width?: number;
};

type NativeDataTableProps<T extends { id: number }> = {
  columns: NativeTableColumn<T>[];
  data: T[];
  emptyMessage: string;
  actionsWidth?: number;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onView?: (row: T) => void;
};

export function NativeDataTable<T extends { id: number }>({
  columns,
  data,
  emptyMessage,
  actionsWidth = 112,
  onEdit,
  onDelete,
  onView,
}: NativeDataTableProps<T>) {
  if (!data.length) {
    return <View style={styles.empty}><Text style={styles.emptyText}>{emptyMessage}</Text></View>;
  }

  const orderedData = columns[0]?.key === 'id'
    ? [...data].sort((left, right) => left.id - right.id)
    : data;
  const tableWidth = Math.max(
    640,
    columns.reduce((width, column) => width + (column.width ?? 150), 0) +
      ((onEdit || onDelete || onView) ? actionsWidth : 0),
  );

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View style={[styles.table, { width: tableWidth }]}>
        <View style={styles.row}>
          {columns.map((column) => <Text key={column.key} style={[styles.cell, styles.header, { width: column.width ?? 150 }]}>{column.header}</Text>)}
          {(onEdit || onDelete || onView) && <Text style={[styles.cell, styles.header, { width: actionsWidth }]}>Ações</Text>}
        </View>
        {orderedData.map((row) => (
          <View key={row.id} style={styles.row}>
            {columns.map((column) => <Text key={`${row.id}-${column.key}`} style={[styles.cell, { width: column.width ?? 150 }]}>{column.render(row)}</Text>)}
            {(onEdit || onDelete || onView) && (
              <View style={[styles.cell, styles.actions, { width: actionsWidth }]}>
                {onView && <Pressable style={[styles.actionButton, styles.viewAction]} accessibilityLabel="Visualizar" onPress={() => onView(row)}><Eye color="#c4b5fd" size={16} /></Pressable>}
                {onEdit && <Pressable style={[styles.actionButton, styles.editAction]} accessibilityLabel="Editar" onPress={() => onEdit(row)}><Pencil color="#93c5fd" size={16} /></Pressable>}
                {onDelete && <Pressable style={[styles.actionButton, styles.deleteAction]} accessibilityLabel="Excluir" onPress={() => onDelete(row)}><Trash2 color="#fca5a5" size={16} /></Pressable>}
              </View>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  table: { borderWidth: 1, borderColor: 'rgba(148,163,184,0.18)', borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(15,23,42,0.75)' },
  row: { flexDirection: 'row', minHeight: 44, borderBottomWidth: 1, borderBottomColor: 'rgba(148,163,184,0.18)', alignItems: 'center' },
  cell: { width: 150, paddingHorizontal: 12, paddingVertical: 10, color: '#cbd5e1', fontSize: 16, lineHeight: 24 },
  header: { color: '#94a3b8', fontWeight: '700', fontSize: 12, lineHeight: 18, textTransform: 'uppercase', letterSpacing: 0.7, backgroundColor: 'rgba(15,23,42,0.95)' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'flex-end' },
  actionButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(148,163,184,0.18)', borderRadius: 10, backgroundColor: 'rgba(148,163,184,0.08)' },
  viewAction: { backgroundColor: 'rgba(139,92,246,0.12)' },
  editAction: { backgroundColor: 'rgba(96,165,250,0.12)' },
  deleteAction: { backgroundColor: 'rgba(239,68,68,0.12)' },
  empty: { borderWidth: 1, borderColor: 'rgba(148,163,184,0.18)', borderRadius: 16, padding: 24, alignItems: 'center' },
  emptyText: { color: '#f8fafc', fontWeight: '700' },
});
