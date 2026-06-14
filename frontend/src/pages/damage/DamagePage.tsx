import { ResourcePage, type ResourceConfig } from "@/shared/crud";

const config: ResourceConfig = {
  title: "Damage Items",
  subtitle: "Damaged or lost stock reports.",
  endpoint: "/damage-items",
  queryKey: "damage-items",
  searchPlaceholder: "Search product, reason…",
  fields: [
    { name: "product_name", label: "Product", required: true },
    { name: "quantity", label: "Qty", type: "number" },
    { name: "reason", label: "Reason", type: "textarea" },
    { name: "branch_id", label: "Branch", type: "select", lookup: "branches", inTable: false },
    { name: "branch", label: "Branch", inForm: false, cell: (r) => (r.branch as { name?: string })?.name ?? "—" },
  ],
};

export default function DamagePage() {
  return <ResourcePage config={config} />;
}
