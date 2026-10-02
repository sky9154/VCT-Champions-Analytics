import type { ReactNode } from "react";


interface RankingColumn<Row> {
  key: string;
  label: ReactNode;
  align?: "left" | "right";
  width?: number;
  render: (row: Row) => ReactNode;
}

interface RankingTableProps<Row> {
  caption: string;
  columns: RankingColumn<Row>[];
  rows: Row[];
  getRowKey: (row: Row) => string;
}

const RankingTable = <Row,>({ caption, columns, rows, getRowKey }: RankingTableProps<Row>) => {
  const tableWidth = columns.reduce((total, column) => total + (column.width ?? 0), 0);

  return (
    <div className="table-scroll" tabIndex={0} aria-label={`${caption}，可水平捲動`}>
      <table className="ranking-table" style={tableWidth > 0 ? { width: `${tableWidth}px` } : undefined}>
        <caption className="visually-hidden">{caption}</caption>
        <colgroup>
          {columns.map((column) => (
            <col key={column.key} style={column.width ? { width: `${column.width}px` } : undefined} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={column.align === "right" ? "numeric-cell" : undefined}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)}>
              {columns.map((column) => (
                <td key={column.key} className={column.align === "right" ? "numeric-cell" : undefined}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export type { RankingColumn };
export { RankingTable };