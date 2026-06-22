import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, Receipt, Users, Camera, Plus, Eye, Pencil } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { outstandingApi, type BillListParams } from "@/entities/outstanding/api";
import { AddBillModal } from "@/features/outstanding/AddBillModal";
import {
  due,
  ageAnchor,
  statusLabel,
  statusVariant,
  agingColor,
  agingBadgeVariant,
  agingRangeLabel,
  type AssigneeLite,
  type ClientOutstanding,
  type Outstanding,
} from "@/entities/outstanding/model";
import { api, apiErrorMessage } from "@/shared/api/client";
import type { ApiEnvelope } from "@/shared/api/types";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { formatCurrency, formatDate, initials } from "@/shared/lib/format";
import { cn } from "@/shared/lib/cn";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CenteredSpinner,
  EmptyState,
  Input,
  PageHeader,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/shared/ui";

type Tab = "bills" | "clients";

const blank = { search: "", staff_id: "", from: "", to: "", status: "", color: "" };

export default function OutstandingPage() {
  const [tab, setTab] = useState<Tab>("bills");
  const [filters, setFilters] = useState({ ...blank });
  const dq = useDebounce(filters.search.trim(), 300);
  const [drawerBill, setDrawerBill] = useState<{ id: number; edit: boolean } | null>(null);
  const [drawerClient, setDrawerClient] = useState<ClientOutstanding | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const setF = (k: keyof typeof blank, v: string) => setFilters((f) => ({ ...f, [k]: v }));

  const { data: staff = [] } = useQuery({
    queryKey: ["lookup", "staff"],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<{ id: number; name: string }[]>>("/staff", { params: { per_page: 100 } });
      return res.data.data ?? [];
    },
    staleTime: 60_000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <PageHeader title="Outstanding" description="Customer bills, balances and payment history." />
        <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add bill</Button>
      </div>

      <StatsPanel />

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        <TabButton active={tab === "bills"} onClick={() => setTab("bills")} icon={<Receipt className="h-4 w-4" />}>Bills</TabButton>
        <TabButton active={tab === "clients"} onClick={() => setTab("clients")} icon={<Users className="h-4 w-4" />}>Clients</TabButton>
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3 border-b border-border p-4">
            <Field label="Search">
              <Input placeholder="Ref / bill / item / client…" value={filters.search} onChange={(e) => setF("search", e.target.value)} className="w-52" />
            </Field>
            <Field label="Staff">
              <Select value={filters.staff_id} onChange={(e) => setF("staff_id", e.target.value)} className="w-40">
                <option value="">All staff</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label="From"><Input type="date" value={filters.from} onChange={(e) => setF("from", e.target.value)} className="w-40" /></Field>
            <Field label="To"><Input type="date" value={filters.to} onChange={(e) => setF("to", e.target.value)} className="w-40" /></Field>
            {tab === "bills" && (
              <Field label="Status">
                <Select value={filters.status} onChange={(e) => setF("status", e.target.value)} className="w-36">
                  <option value="">All</option>
                  <option value="pending">Pending</option>
                  <option value="complete">Complete</option>
                </Select>
              </Field>
            )}
            <Field label="Aging">
              <Select value={filters.color} onChange={(e) => setF("color", e.target.value)} className="w-36">
                <option value="">All</option>
                <option value="green">🟢 0–45 days</option>
                <option value="orange">🟠 46–90 days</option>
                <option value="red">🔴 90+ days</option>
              </Select>
            </Field>
            {(filters.search || filters.staff_id || filters.from || filters.to || filters.status || filters.color) && (
              <Button variant="ghost" size="sm" onClick={() => setFilters({ ...blank })}>Clear</Button>
            )}
          </div>

          {tab === "bills" ? (
            <BillsTable filters={{ ...filters, search: dq }} onOpen={(id, edit) => setDrawerBill({ id, edit })} />
          ) : (
            <ClientsTable filters={{ ...filters, search: dq }} onOpen={setDrawerClient} />
          )}
        </CardContent>
      </Card>

      {drawerBill != null && <BillDrawer billId={drawerBill.id} initialEdit={drawerBill.edit} onClose={() => setDrawerBill(null)} />}
      {drawerClient && <ClientDrawer client={drawerClient} onClose={() => setDrawerClient(null)} />}
      <AddBillModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

// Overview: Total / Paid / Due cards for a chosen month + a toggleable chart.
function StatsPanel() {
  const { data: stats = [] } = useQuery({ queryKey: ["bills", "stats"], queryFn: outstandingApi.stats });
  const [showGraph, setShowGraph] = useState(false);
  const [period, setPeriod] = useState<"this" | "last">("this");

  const idx = period === "this" ? stats.length - 1 : stats.length - 2;
  const cur = stats[idx] ?? { month: "", billed: 0, collected: 0 };
  const dueAmt = Math.max(0, cur.billed - cur.collected);

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">Overview</p>
            <Select value={period} onChange={(e) => setPeriod(e.target.value as "this" | "last")} className="w-36">
              <option value="this">This month</option>
              <option value="last">Last month</option>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowGraph((v) => !v)}>
            {showGraph ? "Hide graph" : "Show graph"}
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Total billed" value={formatCurrency(cur.billed)} />
          <StatCard label="Paid" value={formatCurrency(cur.collected)} tone="ok" />
          <StatCard label="Due" value={formatCurrency(dueAmt)} tone="due" />
        </div>

        {showGraph && (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Total / Paid / Due breakdown for the selected month */}
            <div>
              <p className="mb-2 text-xs text-muted-foreground">{period === "this" ? "This" : "Last"} month — paid vs due</p>
              <div className="relative">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={[{ name: "Paid", value: cur.collected }, { name: "Due", value: dueAmt }].filter((d) => d.value > 0)}
                      dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2}
                    >
                      <Cell fill="#22c55e" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <RTooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-base font-bold">{formatCurrency(cur.billed)}</p>
                  <p className="text-[10px] text-muted-foreground">total</p>
                </div>
              </div>
            </div>
            {/* 6-month trend */}
            <div>
              <p className="mb-2 text-xs text-muted-foreground">Billed vs collected — 6 months</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" fontSize={11} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                  <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={48} />
                  <RTooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="billed" name="Billed" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="collected" name="Collected" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "ok" | "due" }) {
  return (
    <div className="rounded-lg border border-border p-3 text-center">
      <p className={cn("text-lg font-semibold", tone === "ok" && "text-[hsl(var(--success))]", tone === "due" && "text-destructive")}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon} {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <span className="block text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function ageBadge(date?: string | null) {
  const color = agingColor(date);
  return <Badge variant={agingBadgeVariant[color]} title={agingRangeLabel[color]}>{date ? formatDate(date) : agingRangeLabel[color]}</Badge>;
}

// Stacked avatars of the staff assigned to a bill.
function AssigneeAvatars({ assignees }: { assignees?: AssigneeLite[] | null }) {
  const list = assignees ?? [];
  if (list.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex -space-x-2">
      {list.slice(0, 4).map((a) => <Avatar key={a.id} a={a} />)}
      {list.length > 4 && (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-semibold ring-2 ring-background">+{list.length - 4}</span>
      )}
    </div>
  );
}

function Avatar({ a }: { a: AssigneeLite }) {
  return a.photo_url ? (
    <img src={a.photo_url} alt={a.name} title={a.name} className="h-7 w-7 rounded-full object-cover ring-2 ring-background" />
  ) : (
    <span title={a.name} className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold uppercase text-primary ring-2 ring-background">
      {initials(a.name)}
    </span>
  );
}

// Add / remove the staff assigned to a bill (multiple allowed).
function AssigneeManager({ bill }: { bill: Outstanding }) {
  const qc = useQueryClient();
  const [list, setList] = useState<AssigneeLite[]>(bill.assignees ?? []);
  const { data: staff = [] } = useQuery({
    queryKey: ["lookup", "staff"],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<{ id: number; name: string }[]>>("/staff", { params: { per_page: 100 } });
      return res.data.data ?? [];
    },
    staleTime: 60_000,
  });

  const onChanged = (next: AssigneeLite[]) => {
    setList(next);
    qc.invalidateQueries({ queryKey: ["bills"] });
  };
  const add = useMutation({
    mutationFn: (staffId: number) => outstandingApi.addAssignee(bill.id, staffId),
    onSuccess: onChanged,
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (staffId: number) => outstandingApi.removeAssignee(bill.id, staffId),
    onSuccess: onChanged,
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const available = staff.filter((s) => !list.some((a) => a.id === s.id));

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground">Assigned staff</p>
      <div className="flex flex-wrap gap-1.5">
        {list.length === 0 && <span className="text-sm text-muted-foreground">No one assigned yet.</span>}
        {list.map((a) => (
          <span key={a.id} className="flex items-center gap-1.5 rounded-full bg-muted py-1 pl-1 pr-2 text-sm">
            <Avatar a={a} />
            {a.name}
            <button onClick={() => remove.mutate(a.id)} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>
      <Select
        value=""
        onChange={(e) => e.target.value && add.mutate(Number(e.target.value))}
        disabled={add.isPending || available.length === 0}
      >
        <option value="">{available.length === 0 ? "All staff assigned" : "+ Assign staff…"}</option>
        {available.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </Select>
    </div>
  );
}

// ── Bills table ──────────────────────────────────────────────────────
function BillsTable({ filters, onOpen }: { filters: typeof blank; onOpen: (id: number, edit: boolean) => void }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["bills", "admin", { ...filters, page }],
    queryFn: () => {
      const params: BillListParams = { page, per_page: 15 };
      if (filters.search) params.search = filters.search;
      if (filters.staff_id) params.staff_id = filters.staff_id;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (filters.status) params.status = filters.status;
      if (filters.color) params.color = filters.color;
      return outstandingApi.list(params);
    },
    placeholderData: keepPreviousData,
  });
  const items = data?.items ?? [];
  const meta = data?.meta;

  if (isLoading) return <CenteredSpinner label="Loading…" />;
  if (items.length === 0) return <EmptyState title="No bills" description="Bills raised by staff appear here." />;

  return (
    <>
      <Table>
        <THead>
          <TR>
            <TH>Ref</TH><TH>Client</TH><TH>Staff</TH><TH>Total</TH><TH>Paid</TH><TH>Due</TH><TH>Aging</TH><TH>Status</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {items.map((b) => (
            <TR key={b.id} className="cursor-pointer" onClick={() => onOpen(b.id, false)}>
              <TD className="font-mono text-xs text-primary">{b.ref_code || "—"}</TD>
              <TD className="font-medium">{b.customer?.name ?? `#${b.customer_id}`}{b.item_name && <p className="text-xs font-normal text-muted-foreground">{b.item_name}</p>}</TD>
              <TD><AssigneeAvatars assignees={b.assignees} /></TD>
              <TD>{formatCurrency(b.amount)}</TD>
              <TD className="text-muted-foreground">{formatCurrency(b.paid_amount)}</TD>
              <TD className="font-medium text-destructive">{due(b) > 0 ? formatCurrency(due(b)) : "—"}</TD>
              <TD>{due(b) > 0 ? ageBadge(ageAnchor(b)) : <span className="text-muted-foreground">—</span>}</TD>
              <TD><Badge variant={statusVariant[b.status]}>{statusLabel[b.status]}</Badge></TD>
              <TD onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="outline" onClick={() => onOpen(b.id, false)}><Eye className="h-4 w-4" /> View</Button>
                  <Button size="sm" variant="ghost" onClick={() => onOpen(b.id, true)}><Pencil className="h-4 w-4" /></Button>
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <Pager page={page} meta={meta} onPage={setPage} />
    </>
  );
}

// ── Clients table ────────────────────────────────────────────────────
function ClientsTable({ filters, onOpen }: { filters: typeof blank; onOpen: (c: ClientOutstanding) => void }) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["bills", "by-client", { s: filters.search, st: filters.staff_id, f: filters.from, t: filters.to }],
    queryFn: () => outstandingApi.byClient({ search: filters.search, staff_id: filters.staff_id, from: filters.from, to: filters.to }),
  });
  const filtered = filters.color ? rows.filter((r) => agingColor(r.oldest_due) === filters.color) : rows;

  if (isLoading) return <CenteredSpinner label="Loading…" />;
  if (filtered.length === 0) return <EmptyState title="No outstanding clients" description="Clients with a due balance appear here." />;

  return (
    <Table>
      <THead>
        <TR><TH>Client</TH><TH>Phone</TH><TH>Bills</TH><TH>Total due</TH><TH>Oldest due</TH></TR>
      </THead>
      <TBody>
        {filtered.map((r) => (
          <TR key={r.customer_id} className="cursor-pointer" onClick={() => onOpen(r)}>
            <TD className="font-medium">{r.customer_name}</TD>
            <TD className="text-muted-foreground">{r.phone || "—"}</TD>
            <TD>{r.bill_count}</TD>
            <TD className="font-medium text-destructive">{formatCurrency(r.total_due)}</TD>
            <TD>{ageBadge(r.oldest_due)}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

function Pager({ page, meta, onPage }: { page: number; meta?: { total_pages: number; page: number }; onPage: (p: number) => void }) {
  if (!meta || meta.total_pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-border p-4 text-sm">
      <p className="text-muted-foreground">Page {meta.page} of {meta.total_pages}</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
        <Button variant="outline" size="sm" disabled={page >= meta.total_pages} onClick={() => onPage(page + 1)}>Next</Button>
      </div>
    </div>
  );
}

// ── Right-side drawer ────────────────────────────────────────────────
function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

function BillDrawer({ billId, initialEdit, onClose }: { billId: number; initialEdit: boolean; onClose: () => void }) {
  const { data: bill, isLoading } = useQuery({ queryKey: ["bill", billId], queryFn: () => outstandingApi.get(billId) });
  return (
    <Drawer title="Bill details" onClose={onClose}>
      {isLoading || !bill ? <CenteredSpinner /> : <BillDetail bill={bill} initialEdit={initialEdit} />}
    </Drawer>
  );
}

function BillDetail({ bill, initialEdit }: { bill: Outstanding; initialEdit: boolean }) {
  const qc = useQueryClient();
  const payments = bill.payments ?? [];
  const [editing, setEditing] = useState(initialEdit);
  const [billNo, setBillNo] = useState(bill.bill_number);
  const [itemName, setItemName] = useState(bill.item_name);
  const [amount, setAmount] = useState(String(bill.amount));
  const [notes, setNotes] = useState(bill.description);

  const save = useMutation({
    mutationFn: () => outstandingApi.update(bill.id, { bill_number: billNo || undefined, item_name: itemName || undefined, amount: Number(amount), description: notes || undefined }),
    onSuccess: () => {
      toast.success("Bill updated");
      qc.invalidateQueries({ queryKey: ["bill", bill.id] });
      qc.invalidateQueries({ queryKey: ["bills"] });
      setEditing(false);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-1 p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{bill.customer?.name}</p>
            <div className="flex items-center gap-2">
              <Badge variant={statusVariant[bill.status]}>{statusLabel[bill.status]}</Badge>
              {!editing && (
                <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground" aria-label="Edit bill"><Pencil className="h-4 w-4" /></button>
              )}
            </div>
          </div>
          {editing ? (
            <div className="space-y-2 pt-1">
              <Input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="Item name" />
              <Input value={billNo} onChange={(e) => setBillNo(e.target.value)} placeholder="Bill number" />
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Total amount" />
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" />
              <div className="flex gap-2">
                <Button size="sm" loading={save.isPending} onClick={() => save.mutate()}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              {bill.item_name && <p className="text-sm">{bill.item_name}</p>}
              <p className="text-xs text-muted-foreground">
                {bill.ref_code ? <span className="font-mono text-primary">{bill.ref_code}</span> : null}
                {bill.bill_number ? ` · ${bill.bill_number}` : ""} · {formatDate(bill.bill_date)}
              </p>
              {bill.creator?.name && <p className="text-xs text-muted-foreground">Raised by {bill.creator.name}</p>}
            </>
          )}
          <div className="grid grid-cols-3 gap-2 pt-2 text-center text-sm">
            <div><p className="font-semibold">{formatCurrency(bill.amount)}</p><p className="text-[10px] text-muted-foreground">Total</p></div>
            <div><p className="font-semibold">{formatCurrency(bill.paid_amount)}</p><p className="text-[10px] text-muted-foreground">Paid</p></div>
            <div><p className="font-semibold text-destructive">{formatCurrency(due(bill))}</p><p className="text-[10px] text-muted-foreground">Due</p></div>
          </div>
          {bill.image_url && (
            <a href={bill.image_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-primary">
              <Camera className="h-4 w-4" /> Bill photo
            </a>
          )}
        </CardContent>
      </Card>

      <AssigneeManager bill={bill} />

      <div>
        <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Payments ({payments.length})</p>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments yet.</p>
        ) : (
          <div className="space-y-1.5">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <div>
                  <span className="font-medium">{formatCurrency(p.amount)}</span>
                  <span className="ml-2 capitalize text-muted-foreground">{p.payment_type}</span>
                  {p.payment_type === "cheque" && p.cheque_number && <span className="ml-1 text-xs text-muted-foreground">#{p.cheque_number} {p.bank_name}</span>}
                  {p.collector?.name && <p className="text-[11px] text-muted-foreground">by {p.collector.name}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {p.receipt_url && <a href={p.receipt_url} target="_blank" rel="noreferrer" className="text-primary"><Camera className="h-4 w-4" /></a>}
                  <span className="text-xs text-muted-foreground">{formatDate(p.paid_at ?? p.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ClientDrawer({ client, onClose }: { client: ClientOutstanding; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["bills", "client", client.customer_id],
    queryFn: () => outstandingApi.list({ customer_id: client.customer_id, per_page: 100 }),
  });
  const bills = data?.items ?? [];
  return (
    <Drawer title={client.customer_name} onClose={onClose}>
      <div className="mb-3 rounded-lg bg-muted/60 p-3 text-center">
        <p className="text-lg font-semibold text-destructive">{formatCurrency(client.total_due)}</p>
        <p className="text-xs text-muted-foreground">total due across {client.bill_count} bill(s)</p>
      </div>
      {isLoading ? (
        <CenteredSpinner />
      ) : (
        <div className="space-y-2">
          {bills.map((b) => (
            <Card key={b.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{b.item_name || b.bill_number || `Bill #${b.id}`}</p>
                  <Badge variant={statusVariant[b.status]} className="text-[10px]">{statusLabel[b.status]}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono text-primary">{b.ref_code}</span>
                  {b.bill_number ? ` · ${b.bill_number}` : ""} · {formatDate(b.bill_date)}
                </p>
                <div className="mt-1 flex items-center gap-3 text-xs">
                  <span>Total {formatCurrency(b.amount)}</span>
                  <span>Paid {formatCurrency(b.paid_amount)}</span>
                  <span className="font-medium text-destructive">Due {formatCurrency(due(b))}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Drawer>
  );
}
