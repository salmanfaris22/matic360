import { ResourcePage, type ResourceConfig } from "@/shared/crud";
import { formatCurrency } from "@/shared/lib/format";

const config: ResourceConfig = {
  title: "Products",
  subtitle: "Product master catalogue.",
  endpoint: "/products",
  queryKey: "products",
  searchPlaceholder: "Search name, SKU, category…",
  fields: [
    { name: "name", label: "Name", required: true },
    { name: "sku", label: "SKU" },
    { name: "category", label: "Category" },
    { name: "stock", label: "Stock", type: "number" },
    { name: "price", label: "Price", type: "number", step: "0.01", cell: (r) => formatCurrency(r.price as number) },
  ],
};

export default function ProductsPage() {
  return <ResourcePage config={config} />;
}
