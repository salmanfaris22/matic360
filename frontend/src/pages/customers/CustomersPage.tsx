import { ResourcePage, type ResourceConfig } from "@/shared/crud";
import { Badge } from "@/shared/ui";
import { formatCurrency } from "@/shared/lib/format";

const config: ResourceConfig = {
  title: "Clients",
  subtitle: "Shops and buyers served by the company.",
  endpoint: "/customers",
  queryKey: "customers",
  searchPlaceholder: "Search name, shop, contact, email, district…",
  fields: [
    { name: "name", label: "Name", required: true },
    { name: "shop_name", label: "Shop" },
    { name: "contact_person", label: "Contact person", inTable: false },
    { name: "email", label: "Email", inTable: false },
    {
      name: "client_type",
      label: "Type",
      type: "select",
      options: [
        { value: "retailer", label: "Retailer" },
        { value: "wholesaler", label: "Wholesaler" },
        { value: "distributor", label: "Distributor" },
      ],
      cell: (r) => (
        <Badge variant="secondary" className="capitalize">
          {String(r.client_type ?? "retailer")}
        </Badge>
      ),
    },
    { name: "phone", label: "Phone" },
    { name: "district", label: "District" },
    { name: "gst_number", label: "GST", inTable: false },
    { name: "credit_limit", label: "Credit Limit", type: "number", step: "0.01", inTable: false },
    {
      name: "outstanding_amount",
      label: "Outstanding",
      type: "number",
      step: "0.01",
      cell: (r) => formatCurrency(r.outstanding_amount as number),
    },
    { name: "address", label: "Address", type: "textarea", inTable: false },
    { name: "branch_id", label: "Branch", type: "select", lookup: "branches", inTable: false },
  ],
};

export default function CustomersPage() {
  return <ResourcePage config={config} />;
}
