import { ResourcePage, type ResourceConfig } from "@/shared/crud";

const config: ResourceConfig = {
  title: "Users",
  subtitle: "Login accounts and their roles.",
  endpoint: "/users",
  queryKey: "users",
  searchPlaceholder: "Search name, email…",
  fields: [
    { name: "name", label: "Name", required: true },
    { name: "email", label: "Email" },
    { name: "phone", label: "Phone", inTable: false },
    { name: "role_id", label: "Role", type: "select", lookup: "roles", inTable: false },
    { name: "role", label: "Role", inForm: false, cell: (r) => (r.role as { name?: string })?.name ?? "—" },
    { name: "branch_id", label: "Branch", type: "select", lookup: "branches", inTable: false },
    { name: "branch", label: "Branch", inForm: false, cell: (r) => (r.branch as { name?: string })?.name ?? "—" },
    { name: "password", label: "Password (set/reset)", type: "password", inTable: false, placeholder: "Min 6 chars" },
  ],
};

export default function UsersPage() {
  return <ResourcePage config={config} />;
}
