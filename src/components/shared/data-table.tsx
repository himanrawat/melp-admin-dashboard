import { type ReactNode, type CSSProperties, type KeyboardEvent, type MouseEvent, useCallback, useMemo, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
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
  /** Pin this column to the left when the table scrolls horizontally. */
  sticky?: boolean;
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
  /** Show checkboxes for row selection. */
  selectable?: boolean;
  /** Currently selected row keys. */
  selectedKeys?: Set<string>;
  /** Called when selection changes. */
  onSelectionChange?: (keys: Set<string>) => void;
  /** Optional per-row class name callback (e.g. for inactive/disabled styling). */
  rowClassName?: (row: T) => string | undefined;
  /** Max height for the scrollable table body. Header stays fixed. e.g. `"400px"` */
  maxBodyHeight?: string;
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
const CHECKBOX_COL_WIDTH = 40; // matches w-10

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

/** Shared sticky base styles with an opaque background so content doesn't bleed through. */
function stickyBase(left: number, isLastSticky: boolean): CSSProperties {
  return {
    position: "sticky",
    left,
    zIndex: 10,
    ...(isLastSticky ? { boxShadow: "4px 0 6px -2px rgba(0,0,0,0.1)" } : {}),
  };
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      "button, a, input, select, textarea, [role='checkbox'], [data-row-ignore-click='true']",
    ),
  );
}

/** Returns sticky positioning styles for a cell, or undefined if not sticky. */
function stickyStyle<T>(
  col: ColumnDef<T>,
  index: number,
  columns: ColumnDef<T>[],
  selectable?: boolean,
): CSSProperties | undefined {
  if (!col.sticky) return undefined;
  let left = selectable ? CHECKBOX_COL_WIDTH : 0;
  for (let i = 0; i < index; i++) {
    if (columns[i].sticky) {
      left += Number.parseInt(columns[i].minWidth || "0", 10);
    }
  }
  const isLastSticky = !columns.slice(index + 1).some((c) => c.sticky);
  return stickyBase(left, isLastSticky);
}

/** Returns sticky styles for the checkbox column when any column is sticky. */
function checkboxStickyStyle<T>(columns: ColumnDef<T>[]): CSSProperties | undefined {
  const hasSticky = columns.some((c) => c.sticky);
  if (!hasSticky) return undefined;
  const hasMoreSticky = columns.some((c) => c.sticky);
  return stickyBase(0, !hasMoreSticky);
}

// ---------------------------------------------------------------------------
// Sub-components (not exported — internal to DataTable)
// ---------------------------------------------------------------------------

function DataTableHeader<T>({
  columns,
  cellPadding,
  selectable,
  allSelected,
  someSelected,
  onToggleAll,
  stickyHeader,
}: Readonly<{
  columns: ColumnDef<T>[];
  cellPadding: string;
  selectable?: boolean;
  allSelected?: boolean;
  someSelected?: boolean;
  onToggleAll?: () => void;
  stickyHeader?: boolean;
}>) {
  return (
    <TableHeader className={stickyHeader ? "sticky top-0 z-20" : undefined}>
      <TableRow className="border-b border-border bg-muted hover:bg-muted">
        {selectable && (
          <TableHead
            className={cn("w-10", cellPadding)}
            style={checkboxStickyStyle(columns)}
          >
            <Checkbox
              checked={allSelected ? true : someSelected ? "indeterminate" : false}
              onCheckedChange={() => onToggleAll?.()}
              aria-label="Select all"
            />
          </TableHead>
        )}
        {columns.map((col, colIdx) => (
          <TableHead
            key={col.id}
            className={cn(
              "text-xs font-medium uppercase tracking-wider text-muted-foreground",
              cellPadding,
              col.align && ALIGN_CLASS[col.align],
              col.sticky && "bg-muted",
            )}
            style={{ ...columnMinWidth(col), ...stickyStyle(col, colIdx, columns, selectable) }}
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
  selectable,
}: Readonly<{
  columns: ColumnDef<T>[];
  rows: number;
  cellPadding: string;
  selectable?: boolean;
}>) {
  return (
    <TableBody>
      {Array.from({ length: rows }, (_, i) => (
        <TableRow key={i} className="border-b border-border hover:bg-transparent">
          {selectable && (
            <TableCell
              className={cn("w-10 bg-card", cellPadding)}
              style={checkboxStickyStyle(columns)}
            >
              <Skeleton className="size-4" />
            </TableCell>
          )}
          {columns.map((col, colIdx) => (
            <TableCell
              key={col.id}
              className={cn("bg-card", cellPadding)}
              style={{ ...columnMinWidth(col), ...stickyStyle(col, colIdx, columns, selectable) }}
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
  selectable,
  selectedKeys,
  onToggleRow,
  rowClassName,
}: Readonly<{
  columns: ColumnDef<T>[];
  data: T[];
  rowKey?: (row: T) => string;
  onRowClick?: (row: T) => void;
  striped: boolean;
  cellPadding: string;
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onToggleRow?: (key: string) => void;
  rowClassName?: (row: T) => string | undefined;
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

  const handleRowClick = useCallback(
    (row: T) => (e: MouseEvent<HTMLTableRowElement>) => {
      if (isInteractiveTarget(e.target)) return;
      onRowClick?.(row);
    },
    [onRowClick],
  );

  return (
    <TableBody>
      {data.map((row, idx) => {
        const key = rowKey ? rowKey(row) : String(idx);
        const extraRowClass = rowClassName?.(row);

        return (
          <TableRow
            key={key}
            tabIndex={isClickable ? 0 : undefined}
            role={isClickable ? "button" : undefined}
            aria-label={isClickable ? `Select row ${key}` : undefined}
            onClick={isClickable ? handleRowClick(row) : undefined}
            onKeyDown={isClickable ? handleKeyDown(row) : undefined}
            className={cn(
              "group border-b border-border transition-colors",
              isClickable
                ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                : "",
              striped && idx % 2 === 1 && "bg-muted/20",
              extraRowClass,
            )}
          >
            {selectable && (
              <TableCell
                className={cn("w-10 bg-card group-hover:bg-muted transition-colors", cellPadding)}
                style={checkboxStickyStyle(columns)}
              >
                <Checkbox
                  checked={selectedKeys?.has(key) ?? false}
                  onClick={(e) => e.stopPropagation()}
                  onCheckedChange={() => onToggleRow?.(key)}
                  aria-label={`Select row ${key}`}
                />
              </TableCell>
            )}
            {columns.map((col, colIdx) => (
              <TableCell
                key={col.id}
                className={cn(
                  "text-sm bg-card group-hover:bg-muted transition-colors",
                  cellPadding,
                  col.align && ALIGN_CLASS[col.align],
                  col.cellClassName,
                )}
                style={{ ...columnMinWidth(col), ...stickyStyle(col, colIdx, columns, selectable) }}
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
  selectable = false,
  selectedKeys,
  onSelectionChange,
  rowClassName,
  maxBodyHeight,
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

  // Selection helpers
  const allKeys = useMemo(() => {
    if (!selectable || !rowKey) return new Set<string>();
    return new Set(data.map((row, idx) => rowKey ? rowKey(row) : String(idx)));
  }, [selectable, data, rowKey]);

  const allSelected = selectable && selectedKeys != null && allKeys.size > 0 && allKeys.size === selectedKeys.size;
  const someSelected = selectable && selectedKeys != null && selectedKeys.size > 0 && !allSelected;

  const handleToggleAll = useCallback(() => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(allKeys));
    }
  }, [allSelected, allKeys, onSelectionChange]);

  const handleToggleRow = useCallback((key: string) => {
    if (!onSelectionChange || !selectedKeys) return;
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key); else next.add(key);
    onSelectionChange(next);
  }, [selectedKeys, onSelectionChange]);

  const colSpan = columns.length + (selectable ? 1 : 0);

  let body: ReactNode;
  if (loading) {
    body = (
      <DataTableLoadingBody
        columns={columns}
        rows={loadingRows}
        cellPadding={cellPadding}
        selectable={selectable}
      />
    );
  } else if (isEmpty) {
    body = (
      <DataTableEmptyBody colSpan={colSpan}>
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
        selectable={selectable}
        selectedKeys={selectedKeys}
        onToggleRow={handleToggleRow}
        rowClassName={rowClassName}
      />
    );
  }

  return (
    <div
      data-slot="data-table"
      className={cn("w-full max-w-full min-w-0", className)}
    >
      <div
        className="w-full max-w-full overflow-x-auto rounded border border-border bg-card"
        style={maxBodyHeight ? { maxHeight: maxBodyHeight, overflowY: "auto" } : undefined}
      >
        <Table>
          {caption && <TableCaption>{caption}</TableCaption>}
          <DataTableHeader
            columns={columns}
            cellPadding={cellPadding}
            selectable={selectable}
            allSelected={allSelected}
            someSelected={someSelected}
            onToggleAll={handleToggleAll}
            stickyHeader={!!maxBodyHeight}
          />
          {body}
        </Table>
      </div>
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
  );
}
