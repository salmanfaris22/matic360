import { ResourcePage, type ResourceConfig } from "@/shared/crud";
import { Badge } from "@/shared/ui";
import { formatDate } from "@/shared/lib/format";

const statusVariant: Record<string, "secondary" | "warning" | "success"> = {
  pending: "warning",
  picked: "secondary",
  delivered: "success",
};

const config: ResourceConfig = {
  title: "Pickups",
  subtitle: "Product pickup & delivery requests.",
  endpoint: "/pickups",
  queryKey: "pickups",
  searchPlaceholder: "Search product, notes…",
  fields: [
    { name: "customer_id", label: "Customer", type: "select", lookup: "customers", inTable: false },
    { name: "customer", label: "Customer", inForm: false, cell: (r) => (r.customer as { name?: string })?.name ?? "—" },
    { name: "product_name", label: "Product", required: true },
    { name: "quantity", label: "Qty", type: "number" },
    { name: "pickup_date", label: "Date", type: "date", cell: (r) => formatDate(r.pickup_date as string) },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "pending", label: "Pending" },
        { value: "picked", label: "Picked" },
        { value: "delivered", label: "Delivered" },
      ],
      cell: (r) => (
        <Badge variant={statusVariant[(r.status as string) ?? "pending"]} className="capitalize">
          {String(r.status ?? "pending")}
        </Badge>
      ),
    },
    { name: "notes", label: "Notes", type: "textarea", inTable: false },
  ],
};

export default function PickupsPage() {
  return <ResourcePage config={config} />;
}
