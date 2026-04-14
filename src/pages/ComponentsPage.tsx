import { useState } from "react";
import { DataTable, type ColumnDef } from "@/components/shared/data-table";
import { usePopup } from "@/components/shared/popup";
import { mockUsers, type User } from "@/components/users/users-data";

// ---------------------------------------------------------------------------
// Column definitions using real User type
// ---------------------------------------------------------------------------

const statusStyles: Record<User["status"], string> = {
  active: "bg-success/10 text-success",
  inactive: "bg-warning/10 text-warning",
  deleted: "bg-destructive/10 text-destructive",
};

function StatusBadge({ status }: Readonly<{ status: User["status"] }>) {
  return (
    <span
      className={`inline-flex items-center rounded px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}

function UserAvatar({ name }: Readonly<{ name: string }>) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/10 text-xs font-semibold text-primary">
        {initials}
      </div>
      <span className="font-medium">{name}</span>
    </div>
  );
}

const columns: ColumnDef<User>[] = [
  {
    id: "name",
    header: "Name",
    accessor: (row) => <UserAvatar name={row.name} />,
    minWidth: "200px",
  },
  {
    id: "email",
    header: "Email",
    accessor: "email",
    minWidth: "220px",
    cellClassName: "text-muted-foreground",
  },
  {
    id: "department",
    header: "Department",
    accessor: "department",
    minWidth: "140px",
  },
  {
    id: "designation",
    header: "Designation",
    accessor: "designation",
    minWidth: "180px",
  },
  {
    id: "location",
    header: "Location",
    accessor: "location",
    minWidth: "120px",
  },
  {
    id: "status",
    header: "Status",
    accessor: (row) => <StatusBadge status={row.status} />,
    minWidth: "110px",
  },
  {
    id: "joinedAt",
    header: "Joined",
    accessor: (row) =>
      new Date(row.joinedAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    align: "right",
    minWidth: "120px",
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ComponentsPage() {
  const [loading, setLoading] = useState(false);
  const { success: showSuccess } = usePopup();

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-8 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Components</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Shared component library preview. Inspect each variant below.
        </p>
      </div>

      {/* ── DataTable ─────────────────────────────────────────── */}
      <section className="space-y-6">
        <h2 className="text-lg font-semibold">DataTable</h2>

        {/* Default */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Default — with row click
          </h3>
          <DataTable
            columns={columns}
            data={mockUsers}
            rowKey={(row) => row.id}
            onRowClick={(row) => showSuccess("Row Clicked", `Clicked: ${row.name}`)}
          />
        </div>

        {/* Striped + compact */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Striped &amp; Compact
          </h3>
          <DataTable
            columns={columns}
            data={mockUsers}
            rowKey={(row) => row.id}
            striped
            compact
            caption={`Showing ${mockUsers.length} users`}
          />
        </div>

        {/* Loading */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Loading State
            </h3>
            <button
              onClick={() => {
                setLoading(true);
                setTimeout(() => setLoading(false), 2000);
              }}
              className="melp-radius bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Simulate loading
            </button>
          </div>
          <DataTable
            columns={columns}
            data={mockUsers}
            rowKey={(row) => row.id}
            loading={loading}
          />
        </div>

        {/* Empty */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Empty State (default)
          </h3>
          <DataTable columns={columns} data={[]} />
        </div>

        {/* Custom empty */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Empty State (custom message)
          </h3>
          <DataTable
            columns={columns}
            data={[]}
            emptyState={
              <p className="text-sm text-muted-foreground">
                No users match your filters. Try broadening your search.
              </p>
            }
          />
        </div>
      </section>
    </div>
  );
}
