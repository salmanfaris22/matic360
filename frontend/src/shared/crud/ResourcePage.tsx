import { useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2, Inbox } from "lucide-react";
import { toast } from "sonner";
import { apiErrorMessage } from "@/shared/api/client";
import {
  Button,
  Card,
  CardContent,
  CenteredSpinner,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/shared/ui";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { createResourceApi, type ResourceConfig } from "./resource";
import { ResourceForm } from "./ResourceForm";
import { useLookups } from "./useLookups";

// A complete CRUD admin screen driven entirely by a ResourceConfig.
export function ResourcePage({ config }: { config: ResourceConfig }) {
  const resource = useMemo(() => createResourceApi(config.endpoint), [config.endpoint]);
  const lookups = useLookups(config.fields);
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search, 350);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [open, setOpen] = useState(false);

  const tableFields = config.fields.filter((f) => f.inTable !== false);
  const canCreate = config.canCreate !== false;
  const canEdit = config.canEdit !== false;
  const canDelete = config.canDelete !== false;

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: [config.queryKey, { search: debounced, page }],
    queryFn: () => resource.list({ search: debounced, page, per_page: 10 }),
    placeholderData: keepPreviousData,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: [config.queryKey] });

  const save = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      editing?.id ? resource.update(editing.id as number, values) : resource.create(values),
    onSuccess: () => {
      toast.success(editing?.id ? "Updated" : "Created");
      setOpen(false);
      setEditing(null);
      invalidate();
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Save failed")),
  });

  const remove = useMutation({
    mutationFn: (id: number) => resource.remove(id),
    onSuccess: () => {
      toast.success("Deleted");
      invalidate();
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Delete failed")),
  });

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (row: Record<string, unknown>) => {
    setEditing(row);
    setOpen(true);
  };

  const items = (data?.items ?? []) as Record<string, unknown>[];
  const meta = data?.meta;

  const renderCell = (field: (typeof tableFields)[number], row: Record<string, unknown>) => {
    if (field.cell) return field.cell(row);
    const v = row[field.name];
    if (v === null || v === undefined || v === "") return <span className="text-muted-foreground">—</span>;
    return String(v);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{config.title}</h1>
          {config.subtitle && <p className="mt-1 text-sm text-muted-foreground">{config.subtitle}</p>}
        </div>
        {canCreate && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add new
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b border-border p-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={config.searchPlaceholder ?? "Search…"}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            {isFetching && <span className="text-xs text-muted-foreground">Updating…</span>}
          </div>

          {isLoading ? (
            <CenteredSpinner label="Loading…" />
          ) : isError ? (
            <ErrorState />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<Inbox className="h-6 w-6" />}
              title="No records"
              description={canCreate ? "Add your first record to get started." : undefined}
              action={canCreate ? <Button onClick={openCreate}><Plus className="h-4 w-4" /> Add new</Button> : undefined}
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  {tableFields.map((f) => (
                    <TH key={f.name}>{f.label}</TH>
                  ))}
                  {(canEdit || canDelete) && <TH className="text-right">Actions</TH>}
                </TR>
              </THead>
              <TBody>
                {items.map((row) => (
                  <TR key={String(row.id)}>
                    {tableFields.map((f) => (
                      <TD key={f.name}>{renderCell(f, row)}</TD>
                    ))}
                    {(canEdit || canDelete) && (
                      <TD>
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => openEdit(row)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Delete"
                              onClick={() => {
                                if (window.confirm("Delete this record?")) remove.mutate(row.id as number);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TD>
                    )}
                  </TR>
                ))}
              </TBody>
            </Table>
          )}

          {meta && meta.total_pages > 1 && (
            <div className="flex items-center justify-between border-t border-border p-4 text-sm">
              <p className="text-muted-foreground">
                Page {meta.page} of {meta.total_pages} · {meta.total} total
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.total_pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing?.id ? `Edit ${config.title}` : `Add ${config.title}`}
        size="lg"
      >
        <ResourceForm
          config={config}
          initial={editing}
          lookups={lookups}
          submitting={save.isPending}
          onSubmit={(values) => save.mutate(values)}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </div>
  );
}
