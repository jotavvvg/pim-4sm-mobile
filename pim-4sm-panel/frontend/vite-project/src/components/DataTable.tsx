import type { ReactNode } from 'react';

export type DataTableColumn<T> = {
  key: keyof T | string;
  header: string;
  render?: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
};

export function DataTable<T extends object>({
  columns,
  data,
  rowKey,
  emptyMessage = 'Nenhum registro encontrado.',
  onRowClick,
}: DataTableProps<T>) {
  if (!data.length) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={String(rowKey(row))}
              onClick={() => onRowClick?.(row)}
              className={onRowClick ? 'clickable-row' : undefined}
            >
              {columns.map((column) => {
                const cellValue = row[column.key as keyof T];

                return (
                  <td key={`${String(rowKey(row))}-${String(column.key)}`}>
                    {column.render ? column.render(row) : String(cellValue ?? '-')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
