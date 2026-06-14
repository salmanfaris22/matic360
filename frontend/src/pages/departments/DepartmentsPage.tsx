import { ResourcePage, type ResourceConfig } from "@/shared/crud";

const config: ResourceConfig = {
  title: "Departments",
  subtitle: "Functional groups for staff.",
  endpoint: "/departments",
  queryKey: "departments",
  searchPlaceholder: "Search name…",
  fields: [
    { name: "name", label: "Name", required: true },
    { name: "description", label: "Description", type: "textarea" },
  ],
};

export default function DepartmentsPage() {
  return <ResourcePage config={config} />;
}
