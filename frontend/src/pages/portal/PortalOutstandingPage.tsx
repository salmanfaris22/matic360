import { useState, useRef, useMemo, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Plus, Wallet, Camera, RefreshCw, Pencil, Search, PieChart as PieIcon } from "lucide-react";
import { toast } from "sonner";
import { outstandingApi, type AddPaymentInput } from "@/entities/outstanding/api";
import {
  due,
  ageAnchor,
  statusLabel,
  statusVariant,
  agingColor,
  agingBadgeVariant,
  paymentTypeOptions,
  type Outstanding,
  type PaymentType,
} from "@/entities/outstanding/model";
import { AddBillModal } from "@/features/outstanding/AddBillModal";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { apiErrorMessage } from "@/shared/api/client";
import { formatCurrency, formatDate } from "@/shared/lib/format";
import { cn } from "@/shared/lib/cn";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CenteredSpinner,
  EmptyState,
  Input,
  Label,
  Modal,
  Select,
} from "@/shared/ui";

export default function PortalOutstandingPage() {
  const [search, setSearch] = useState("");
  const dq = useDebounce(search.trim(), 300);
  const [status, setStatus] = useState("");
  const [color, setColor] = useState("");
  const [adding, setAdding] = useState(false);
  const [activeBill, setActiveBill] = useState<number | null>(null);
  const [showGraph, setShowGraph] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["bills", "mine", { dq, status, color }],
    queryFn: () => outstandingApi.list({ search: dq || undefined, status: status || undefined, color: color || undefined, per_page: 50 }),
  });

  const bills = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <Wallet className="h-5 w-5 text-primary" /> Outstanding
        </h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowGraph((v) => !v)}>
            <PieIcon className="h-4 w-4" /> {showGraph ? "Hide" : "Graph"}
          </Button>
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </div>

      {showGraph && <DueDonut bills={bills} />}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search bill / item…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-28">
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="complete">Complete</option>
        </Select>
        <Select value={color} onChange={(e) => setColor(e.target.value)} className="w-28" aria-label="Aging">
          <option value="">Aging</option>
          <option value="green">🟢 0–45</option>
          <option value="orange">🟠 46–90</option>
          <option value="red">🔴 90+</option>
        </Select>
      </div>

      {isLoading ? (
        <CenteredSpinner label="Loading…" />
      ) : bills.length === 0 ? (
        <EmptyState title="No bills yet" description="Tap Add to raise a customer bill." />
      ) : (
        <div className="space-y-2.5">
          {bills.map((b) => (
            <BillCard key={b.id} bill={b} onOpen={() => setActiveBill(b.id)} />
          ))}
        </div>
      )}

      <AddBillModal open={adding} onClose={() => setAdding(false)} />
      <BillDetailModal billId={activeBill} onClose={() => setActiveBill(null)} />
    </div>
  );
}

const AGING_HEX: Record<"green" | "orange" | "red", string> = { green: "#22c55e", orange: "#f59e0b", red: "#ef4444" };

// Round (donut) chart of the staff member's own outstanding due, by age bucket.
function DueDonut({ bills }: { bills: Outstanding[] }) {
  const { data, totalDue } = useMemo(() => {
    const acc: Record<"green" | "orange" | "red", number> = { green: 0, orange: 0, red: 0 };
    bills.forEach((b) => { const d = due(b); if (d > 0) acc[agingColor(ageAnchor(b))] += d; });
    const rows = [
      { name: "0–45 days", value: acc.green, key: "green" as const },
      { name: "46–90 days", value: acc.orange, key: "orange" as const },
      { name: "90+ days", value: acc.red, key: "red" as const },
    ].filter((r) => r.value > 0);
    return { data: rows, totalDue: acc.green + acc.orange + acc.red };
  }, [bills]);

  if (totalDue <= 0) {
    return <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No outstanding due to chart.</CardContent></Card>;
  }
  return (
    <Card>
      <CardContent className="p-4">
        <p className="mb-1 text-sm font-semibold">My outstanding by age</p>
        <div className="relative">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2}>
                {data.map((d) => <Cell key={d.key} fill={AGING_HEX[d.key]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-lg font-bold">{formatCurrency(totalDue)}</p>
            <p className="text-[10px] text-muted-foreground">total due</p>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
          {data.map((d) => (
            <span key={d.key} className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: AGING_HEX[d.key] }} /> {d.name}: {formatCurrency(d.value)}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function BillCard({ bill, onOpen }: { bill: Outstanding; onOpen: () => void }) {
  const color = agingColor(ageAnchor(bill));
  const remaining = due(bill);
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <button className="flex-1 text-left" onClick={onOpen}>
          <div className="flex items-center gap-2">
            <p className="font-medium">{bill.customer?.name ?? `#${bill.customer_id}`}</p>
            <Badge variant={statusVariant[bill.status]} className="text-[10px]">
              {statusLabel[bill.status]}
            </Badge>
          </div>
          {bill.item_name && <p className="mt-0.5 text-xs text-foreground">{bill.item_name}</p>}
          <p className="mt-0.5 text-xs text-muted-foreground">
            {bill.ref_code ? <span className="font-mono text-primary">{bill.ref_code}</span> : null}
            {bill.bill_number ? ` · ${bill.bill_number}` : ""}
            {` · ${formatCurrency(bill.amount)} total`}
          </p>
          <div className="mt-1 flex items-center gap-2 text-xs">
            <span className={cn("font-medium", remaining > 0 ? "text-destructive" : "text-[hsl(var(--success))]")}>
              {remaining > 0 ? `${formatCurrency(remaining)} due` : "Fully paid"}
            </span>
            {remaining > 0 && (
              <Badge variant={agingBadgeVariant[color]} className="text-[10px]">{formatDate(ageAnchor(bill))}</Badge>
            )}
          </div>
        </button>
        <Button size="sm" variant="outline" onClick={onOpen} className="shrink-0 rounded-full px-3">
          <Plus className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Bill detail + payment history + add payment ──────────────────────
function BillDetailModal({ billId, onClose }: { billId: number | null; onClose: () => void }) {
  const { data: bill, isLoading } = useQuery({
    queryKey: ["bill", billId],
    queryFn: () => outstandingApi.get(billId as number),
    enabled: billId != null,
  });

  return (
    <Modal open={billId != null} onClose={onClose} variant="sheet" title="Bill details">
      {isLoading || !bill ? (
        <CenteredSpinner label="Loading…" />
      ) : (
        <BillDetail bill={bill} onClose={onClose} />
      )}
    </Modal>
  );
}

function BillDetail({ bill, onClose }: { bill: Outstanding; onClose: () => void }) {
  const qc = useQueryClient();
  const remaining = due(bill);
  const payments = bill.payments ?? [];

  // Inline bill edit.
  const [editing, setEditing] = useState(false);
  const [eBillNo, setEBillNo] = useState(bill.bill_number);
  const [eItemName, setEItemName] = useState(bill.item_name);
  const [eAmount, setEAmount] = useState(String(bill.amount));
  const [eNotes, setENotes] = useState(bill.description);
  const saveEdit = useMutation({
    mutationFn: () => outstandingApi.update(bill.id, {
      bill_number: eBillNo || undefined,
      item_name: eItemName || undefined,
      amount: Number(eAmount),
      description: eNotes || undefined,
    }),
    onSuccess: () => {
      toast.success("Bill updated");
      qc.invalidateQueries({ queryKey: ["bill", bill.id] });
      qc.invalidateQueries({ queryKey: ["bills"] });
      setEditing(false);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const [amount, setAmount] = useState("");
  const [type, setType] = useState<PaymentType>("cash");
  const [chequeNumber, setChequeNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [notes, setNotes] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const add = useMutation({
    mutationFn: async () => {
      const input: AddPaymentInput = {
        amount: Number(amount),
        payment_type: type,
        cheque_number: type === "cheque" ? chequeNumber : undefined,
        bank_name: type === "cheque" ? bankName : undefined,
        next_payment_date: nextDate || undefined,
        notes: notes || undefined,
      };
      const updated = await outstandingApi.addPayment(bill.id, input);
      if (image) {
        const newest = (updated.payments ?? []).slice(-1)[0];
        if (newest) await outstandingApi.uploadPaymentImage(newest.id, image);
      }
      return updated;
    },
    onSuccess: () => {
      toast.success("Payment added ✅");
      qc.invalidateQueries({ queryKey: ["bill", bill.id] });
      qc.invalidateQueries({ queryKey: ["bills"] });
      setAmount(""); setChequeNumber(""); setBankName(""); setNextDate(""); setNotes("");
      setImage(null); setPreview(null);
      onClose(); // close the bill sheet after recording a payment
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setImage(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const canAdd = Number(amount) > 0 && (type !== "cheque" || chequeNumber.trim());

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardContent className="space-y-1 p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{bill.customer?.name}</p>
            <div className="flex items-center gap-2">
              <Badge variant={statusVariant[bill.status]}>{statusLabel[bill.status]}</Badge>
              {!editing && (
                <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground" aria-label="Edit bill">
                  <Pencil className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {editing ? (
            <div className="space-y-2 pt-1">
              <Input value={eItemName} onChange={(e) => setEItemName(e.target.value)} placeholder="Item name" />
              <Input value={eBillNo} onChange={(e) => setEBillNo(e.target.value)} placeholder="Bill number" />
              <Input type="number" inputMode="decimal" value={eAmount} onChange={(e) => setEAmount(e.target.value)} placeholder="Total amount" />
              <Input value={eNotes} onChange={(e) => setENotes(e.target.value)} placeholder="Notes" />
              <div className="flex gap-2">
                <Button size="sm" loading={saveEdit.isPending} onClick={() => saveEdit.mutate()}>Save</Button>
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
            </>
          )}

          <div className="grid grid-cols-3 gap-2 pt-2 text-center">
            <Stat label="Total" value={formatCurrency(bill.amount)} />
            <Stat label="Paid" value={formatCurrency(bill.paid_amount)} />
            <Stat label="Due" value={formatCurrency(remaining)} tone={remaining > 0 ? "due" : "ok"} />
          </div>
        </CardContent>
      </Card>

      {/* History */}
      {payments.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Payment history</p>
          <div className="space-y-1.5">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <div>
                  <span className="font-medium">{formatCurrency(p.amount)}</span>
                  <span className="ml-2 capitalize text-muted-foreground">{p.payment_type}</span>
                  {p.payment_type === "cheque" && p.cheque_number && (
                    <span className="ml-1 text-xs text-muted-foreground">#{p.cheque_number}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {p.receipt_url && (
                    <a href={p.receipt_url} target="_blank" rel="noreferrer" className="text-primary">
                      <Camera className="h-4 w-4" />
                    </a>
                  )}
                  <span className="text-xs text-muted-foreground">{formatDate(p.paid_at ?? p.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add payment */}
      {bill.status !== "closed" ? (
        <Card className="border-primary/30">
          <CardContent className="space-y-3 p-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold"><Plus className="h-4 w-4 text-primary" /> Add payment</p>
            <div className="space-y-1.5">
              <Label>Amount paid now</Label>
              <Input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`Max ${formatCurrency(remaining)}`} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {paymentTypeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  className={cn(
                    "rounded-lg border py-2 text-sm font-medium transition-colors",
                    type === opt.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {type === "cheque" && (
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-2.5">
                <Input value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} placeholder="Cheque #" />
                <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Next paying date</Label>
              <Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Receipt / cheque photo</Label>
              <ImagePicker preview={preview} onClick={() => fileRef.current?.click()} small />
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />
            </div>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" />
            <Button className="w-full" loading={add.isPending} disabled={!canAdd} onClick={() => add.mutate()}>
              Add payment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg bg-[hsl(var(--success))]/10 p-3 text-center text-sm text-[hsl(var(--success))]">
          This bill is fully paid.
        </div>
      )}

      <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "due" | "ok" }) {
  return (
    <div className="rounded-lg bg-muted/60 p-2">
      <p className={cn("text-sm font-semibold", tone === "due" && "text-destructive", tone === "ok" && "text-[hsl(var(--success))]")}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function ImagePicker({ preview, onClick, small }: { preview: string | null; onClick: () => void; small?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted transition-colors hover:border-primary",
        small ? "h-20" : "h-28",
      )}
    >
      {preview ? (
        <div className="relative h-full w-full">
          <img src={preview} alt="preview" className="h-full w-full object-cover" />
          <span className="absolute bottom-1 right-1 rounded-full bg-background/90 p-1.5 shadow">
            <RefreshCw className="h-4 w-4" />
          </span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1 text-muted-foreground">
          <Camera className="h-5 w-5" />
          <span className="text-xs">Tap to add photo</span>
        </div>
      )}
    </button>
  );
}
