import { ResourcePage, type ResourceConfig } from "@/shared/crud";
import { Badge } from "@/shared/ui";
import { formatCurrency, formatDate } from "@/shared/lib/format";

const statusVariant: Record<string, "default" | "warning" | "success"> = {
  open: "warning",
  partial: "default",
  closed: "success",
};

const config: ResourceConfig = {
  title: "Outstanding",
  subtitle: "Customer credit (receivables) ledger.",
  endpoint: "/outstandings",
  queryKey: "outstandings",
  searchPlaceholder: "Search description…",
  fields: [
    { name: "customer_id", label: "Customer", type: "select", lookup: "customers", inTable: false },
    { name: "customer", label: "Customer", inForm: false, cell: (r) => (r.customer as { name?: string })?.name ?? "—" },
    { name: "amount", label: "Amount", type: "number", step: "0.01", cell: (r) => formatCurrency(r.amount as number) },
    { name: "paid_amount", label: "Paid", type: "number", step: "0.01", inTable: false },
    { name: "due_date", label: "Due", type: "date", cell: (r) => formatDate(r.due_date as string) },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "open", label: "Open" },
        { value: "partial", label: "Partial" },
        { value: "closed", label: "Closed" },
      ],
      cell: (r) => (
        <Badge variant={statusVariant[(r.status as string) ?? "open"]} className="capitalize">
          {String(r.status ?? "open")}
        </Badge>
      ),
    },
    { name: "description", label: "Description", type: "textarea", inTable: false },
  ],
};

export default function OutstandingPage() {
  return <ResourcePage config={config} />;
}
