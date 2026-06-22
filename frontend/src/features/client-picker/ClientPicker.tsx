import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, ChevronDown, Check } from "lucide-react";
import { toast } from "sonner";
import { customersApi } from "@/entities/customer/api";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { apiErrorMessage } from "@/shared/api/client";
import { cn } from "@/shared/lib/cn";
import { Input } from "@/shared/ui";

interface ClientPickerProps {
  value: number | "";
  valueName?: string;
  onChange: (id: number, name: string) => void;
  allowCreate?: boolean;
  placeholder?: string;
}

// Searchable client dropdown with inline "+ Add client".
export function ClientPicker({
  value,
  valueName,
  onChange,
  allowCreate = true,
  placeholder = "Select client…",
}: ClientPickerProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const dq = useDebounce(q.trim(), 250);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["clients", "search", dq],
    queryFn: () => customersApi.search(dq),
    enabled: open,
  });

  const create = useMutation({
    mutationFn: () => customersApi.quickCreate(q.trim()),
    onSuccess: (c) => {
      toast.success(`Added ${c.name}`);
      onChange(c.id, c.name);
      qc.invalidateQueries({ queryKey: ["clients", "search"] });
      setOpen(false);
      setQ("");
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const exactMatch = results.some((r) => r.name.toLowerCase() === q.trim().toLowerCase());
  const showAdd = allowCreate && q.trim().length >= 2 && !exactMatch;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm"
      >
        <span className={cn(!value && "text-muted-foreground")}>{value ? valueName : placeholder}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-card shadow-xl">
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name or phone…"
                className="h-10 border-0 px-0 focus-visible:ring-0"
              />
            </div>
            <div className="max-h-56 overflow-y-auto">
              {isFetching && results.length === 0 ? (
                <p className="px-3 py-3 text-sm text-muted-foreground">Searching…</p>
              ) : results.length === 0 && !showAdd ? (
                <p className="px-3 py-3 text-sm text-muted-foreground">No clients found.</p>
              ) : (
                results.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      onChange(r.id, r.name);
                      setOpen(false);
                      setQ("");
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    <span>
                      {r.name}
                      {r.phone ? <span className="ml-2 text-xs text-muted-foreground">{r.phone}</span> : null}
                    </span>
                    {value === r.id && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))
              )}
              {showAdd && (
                <button
                  type="button"
                  disabled={create.isPending}
                  onClick={() => create.mutate()}
                  className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-sm font-medium text-primary hover:bg-muted"
                >
                  <Plus className="h-4 w-4" /> Add "{q.trim()}"
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
