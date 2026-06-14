import { ResourcePage, type ResourceConfig } from "@/shared/crud";
import { Badge } from "@/shared/ui";

const config: ResourceConfig = {
  title: "Roles",
  subtitle: "Access roles. System roles (super admin / admin / staff) are protected.",
  endpoint: "/roles",
  queryKey: "roles",
  searchPlaceholder: "Search roles…",
  fields: [
    { name: "name", label: "Name", required: true },
    { name: "slug", label: "Slug", placeholder: "e.g. branch_manager" },
    { name: "description", label: "Description", type: "textarea" },
    {
      name: "is_system",
      label: "Type",
      inForm: false,
      cell: (r) =>
        r.is_system ? <Badge variant="secondary">System</Badge> : <Badge>Custom</Badge>,
    },
  ],
};

export default function RolesPage() {
  return <ResourcePage config={config} />;
}
