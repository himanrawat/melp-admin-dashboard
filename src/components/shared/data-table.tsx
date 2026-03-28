import { type ReactNode, type CSSProperties, type KeyboardEvent, useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Column definition for the DataTable component. */
export type ColumnDef<T> = {
  /** Unique column identifier. */
  id: string;
  /** Header label rendered in the `<th>`. */
  header: string;
  /**
   * Cell value accessor.
   * - `keyof T` — renders `row[key]` as text.
   * - `(row: T) => ReactNode` — full control over the cell content.
   */
  accessor: keyof T | ((row: T) => ReactNode);
  /** CSS min-width for the column (e.g. `"200px"`). */
  minWidth?: string;
  /** Horizontal text alignment. Defaults to `"left"`. */
  align?: "left" | "center" | "right";
  /** Additional class names applied to every body cell in this column. */
  cellClassName?: string;
};

/** Props accepted by `<DataTable />`. */
export type DataTableProps<T> = {
  /** Column definitions. */
  columns: ColumnDef<T>[];
  /** Row data array. */
  data: T[];
  /** Unique key extractor per row. Falls back to the row index when omitted. */
  rowKey?: (row: T) => string;
  /** Row click handler. Enables pointer cursor, hover, and keyboard activation. */
  onRowClick?: (row: T) => void;
  /** Alternate row background tint. */
  striped?: boolean;
  /** Tighter cell padding for dense layouts. */
  compact?: boolean;
  /** Render a skeleton placeholder instead of data. */
  loading?: boolean;
  /** Number of skeleton rows shown while `loading` is `true`. @default 5 */
  loadingRows?: number;
  /** Custom empty-state content. Defaults to a plain "No results found." label. */
  emptyState?: ReactNode;
  /** Accessible table caption text. */
  caption?: string;
  /** Extra class names on the outermost wrapper. */
  className?: string;
  /** Enable client-side pagination. When `true`, defaults to 10 rows per page. */
  paginated?: boolean;
  /** Number of rows per page. Only used when `paginated` is `true`. @default 10 */
  pageSize?: number;
  /** Available page-size options shown in the selector. @default [10, 20, 30, 50] */
  pageSizeOptions?: number[];
};

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const ALIGN_CLASS = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const;

const CELL_PADDING_DEFAULT = "px-4 py-3";
const CELL_PADDING_COMPACT = "px-3 py-1.5";
const SKELETON_ROWS_DEFAULT = 5;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function resolveCell<T>(row: T, accessor: ColumnDef<T>["accessor"]): ReactNode {
  if (typeof accessor === "function") return accessor(row);
  return row[accessor] as ReactNode;
}

function columnMinWidth<T>(col: ColumnDef<T>): CSSProperties | undefined {
  if (!col.minWidth) return undefined;
  return { minWidth: col.minWidth };
}

// ---------------------------------------------------------------------------
// Sub-components (not exported — internal to DataTable)
// ---------------------------------------------------------------------------

function DataTableHeader<T>({
  columns,
  cellPadding,
}: Readonly<{
  columns: ColumnDef<T>[];
  cellPadding: string;
}>) {
  return (
    <TableHeader>
      <TableRow className="border-b border-border hover:bg-transparent">
        {columns.map((col) => (
          <TableHead
            key={col.id}
            className={cn(
              "text-xs font-medium uppercase tracking-wider text-muted-foreground",
              cellPadding,
              col.align && ALIGN_CLASS[col.align],
            )}
            style={columnMinWidth(col)}
          >
            {col.header}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}

function DataTableLoadingBody<T>({
  columns,
  rows,
  cellPadding,
}: Readonly<{
  columns: ColumnDef<T>[];
  rows: number;
  cellPadding: string;
}>) {
  return (
    <TableBody>
      {Array.from({ length: rows }, (_, i) => (
        <TableRow key={i} className="border-b border-border hover:bg-transparent">
          {columns.map((col) => (
            <TableCell
              key={col.id}
              className={cn(cellPadding)}
              style={columnMinWidth(col)}
            >
              <Skeleton className="h-4 w-3/4" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
}

function DataTableEmptyBody({
  colSpan,
  children,
}: Readonly<{
  colSpan: number;
  children?: ReactNode;
}>) {
  return (
    <TableBody>
      <TableRow className="hover:bg-transparent">
        <TableCell
          colSpan={colSpan}
          className="h-32 text-center text-sm text-muted-foreground"
        >
          {children ?? "No results found."}
        </TableCell>
      </TableRow>
    </TableBody>
  );
}

function DataTableDataBody<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  striped,
  cellPadding,
}: Readonly<{
  columns: ColumnDef<T>[];
  data: T[];
  rowKey?: (row: T) => string;
  onRowClick?: (row: T) => void;
  striped: boolean;
  cellPadding: string;
}>) {
  const isClickable = !!onRowClick;

  const handleKeyDown = useCallback(
    (row: T) => (e: KeyboardEvent<HTMLTableRowElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onRowClick?.(row);
      }
    },
    [onRowClick],
  );

  return (
    <TableBody>
      {data.map((row, idx) => {
        const key = rowKey ? rowKey(row) : String(idx);

        return (
          <TableRow
            key={key}
            tabIndex={isClickable ? 0 : undefined}
            role={isClickable ? "button" : undefined}
            aria-label={isClickable ? `Select row ${key}` : undefined}
            onClick={isClickable ? () => onRowClick(row) : undefined}
            onKeyDown={isClickable ? handleKeyDown(row) : undefined}
            className={cn(
              "border-b border-border transition-colors",
              isClickable
                ? "cursor-pointer hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                : "hover:bg-muted/30",
              striped && idx % 2 === 1 && "bg-muted/20",
            )}
          >
            {columns.map((col) => (
              <TableCell
                key={col.id}
                className={cn(
                  "text-sm",
                  cellPadding,
                  col.align && ALIGN_CLASS[col.align],
                  col.cellClassName,
                )}
                style={columnMinWidth(col)}
              >
                {resolveCell(row, col.accessor)}
              </TableCell>
            ))}
          </TableRow>
        );
      })}
    </TableBody>
  );
}

// ---------------------------------------------------------------------------
// Pagination controls
// ---------------------------------------------------------------------------

const PAGE_SIZE_OPTIONS_DEFAULT = [10, 20, 30, 50];

function DataTablePagination({
  page,
  pageCount,
  pageSize,
  pageSizeOptions,
  totalRows,
  onPageChange,
  onPageSizeChange,
}: Readonly<{
  page: number;
  pageCount: number;
  pageSize: number;
  pageSizeOptions: number[];
  totalRows: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}>) {
  const start = page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, totalRows);

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <span>Rows per page</span>
        <Select
          value={String(pageSize)}
          onValueChange={(v) => onPageSizeChange(Number(v))}
        >
          <SelectTrigger className="h-8 w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((opt) => (
              <SelectItem key={opt} value={String(opt)}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span>
          {start}–{end} of {totalRows}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            disabled={page === 0}
            onClick={() => onPageChange(0)}
            aria-label="First page"
          >
            «
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            disabled={page === 0}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            ‹
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            disabled={page >= pageCount - 1}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            ›
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            disabled={page >= pageCount - 1}
            onClick={() => onPageChange(pageCount - 1)}
            aria-label="Last page"
          >
            »
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DataTable — public component
// ---------------------------------------------------------------------------
//
// ## Overflow isolation
//
// The component uses a three-layer wrapper to guarantee that horizontal
// overflow is **confined to the table area only** and never leaks into the
// page, sidebar, or any ancestor flex/grid container.
//
//  ┌─ OUTER ─────────────────────────────────────────────────────────┐
//  │  w-full  max-w-full  min-w-0                                   │
//  │                                                                 │
//  │  `min-w-0` is the critical piece: flex and grid children        │
//  │  default to `min-width: auto`, which prevents them from         │
//  │  shrinking below their content width. A wide <table> inside     │
//  │  such a child would push every ancestor wider — ultimately      │
//  │  causing the entire page to scroll horizontally.                │
//  │  `min-w-0` overrides that default and lets this element         │
//  │  shrink to the width its parent allocates.                      │
//  │                                                                 │
//  │  ┌─ SCROLL WRAPPER ──────────────────────────────────────────┐  │
//  │  │  w-full  max-w-full  overflow-x-auto                      │  │
//  │  │                                                            │  │
//  │  │  This is the **only** element that scrolls horizontally.   │  │
//  │  │  `overflow-x-auto` creates a new block formatting context  │  │
//  │  │  so wide content is clipped here, not propagated up.       │  │
//  │  │                                                            │  │
//  │  │  ┌─ <Table> ───────────────────────────────────────────┐   │  │
//  │  │  │  Each column uses its `minWidth` prop as an inline  │   │  │
//  │  │  │  style. The sum of column min-widths determines     │   │  │
//  │  │  │  whether the table exceeds the wrapper and triggers │   │  │
//  │  │  │  horizontal scrolling.                              │   │  │
//  │  │  └─────────────────────────────────────────────────────┘   │  │
//  │  └────────────────────────────────────────────────────────────┘  │
//  └─────────────────────────────────────────────────────────────────┘
//
// This structure is safe inside:
//   • flex layouts (SidebarInset is `flex flex-col`)
//   • grid layouts (dashboard pages use CSS grid)
//   • cards, tabs, drawers, sheets, or any constrained container

export function DataTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  striped = false,
  compact = false,
  loading = false,
  loadingRows = SKELETON_ROWS_DEFAULT,
  emptyState,
  caption,
  className,
  paginated = false,
  pageSize: initialPageSize = 10,
  pageSizeOptions = PAGE_SIZE_OPTIONS_DEFAULT,
}: Readonly<DataTableProps<T>>) {
  const cellPadding = compact ? CELL_PADDING_COMPACT : CELL_PADDING_DEFAULT;

  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const pageCount = Math.max(1, Math.ceil(data.length / pageSize));

  // Reset to first page when data length changes or page size changes
  const safeCurrentPage = currentPage >= pageCount ? 0 : currentPage;

  const visibleData = useMemo(() => {
    if (!paginated || loading) return data;
    const start = safeCurrentPage * pageSize;
    return data.slice(start, start + pageSize);
  }, [paginated, loading, data, safeCurrentPage, pageSize]);

  const isEmpty = !loading && data.length === 0;

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(0);
  };

  let body: ReactNode;
  if (loading) {
    body = (
      <DataTableLoadingBody
        columns={columns}
        rows={loadingRows}
        cellPadding={cellPadding}
      />
    );
  } else if (isEmpty) {
    body = (
      <DataTableEmptyBody colSpan={columns.length}>
        {emptyState}
      </DataTableEmptyBody>
    );
  } else {
    body = (
      <DataTableDataBody
        columns={columns}
        data={visibleData}
        rowKey={rowKey}
        onRowClick={onRowClick}
        striped={striped}
        cellPadding={cellPadding}
      />
    );
  }

  return (
    <div
      data-slot="data-table"
      className={cn("w-full max-w-full min-w-0", className)}
    >
      <div className="w-full max-w-full overflow-x-auto rounded border border-border bg-card">
        <Table>
          {caption && <TableCaption>{caption}</TableCaption>}
          <DataTableHeader columns={columns} cellPadding={cellPadding} />
          {body}
        </Table>
        {paginated && !loading && !isEmpty && (
          <DataTablePagination
            page={safeCurrentPage}
            pageCount={pageCount}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            totalRows={data.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
      </div>
    </div>
  );
}
