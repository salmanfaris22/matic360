import { ResourcePage, type ResourceConfig } from "@/shared/crud";
import { Badge } from "@/shared/ui";

const config: ResourceConfig = {
  title: "Branches",
  subtitle: "Company locations and head office.",
  endpoint: "/branches",
  queryKey: "branches",
  searchPlaceholder: "Search name, code, district…",
  fields: [
    { name: "name", label: "Name", required: true },
    { name: "code", label: "Code" },
    { name: "district", label: "District" },
    { name: "phone", label: "Phone" },
    { name: "address", label: "Address", type: "textarea", inTable: false },
    {
      name: "is_head_office",
      label: "Head Office",
      inForm: false,
      cell: (r) => (r.is_head_office ? <Badge>Head Office</Badge> : <span className="text-muted-foreground">—</span>),
    },
  ],
};

export default function BranchesPage() {
  return <ResourcePage config={config} />;
}
