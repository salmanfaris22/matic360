import { ResourcePage, type ResourceConfig } from "@/shared/crud";
import { formatDate } from "@/shared/lib/format";

const config: ResourceConfig = {
  title: "New Arrivals",
  subtitle: "Recently launched products highlighted to staff.",
  endpoint: "/new-arrivals",
  queryKey: "new-arrivals",
  searchPlaceholder: "Search name…",
  fields: [
    { name: "name", label: "Name", required: true },
    { name: "description", label: "Description", type: "textarea" },
    {
      name: "launch_date",
      label: "Launch Date",
      type: "date",
      cell: (r) => formatDate(r.launch_date as string),
    },
  ],
};

export default function NewArrivalsPage() {
  return <ResourcePage config={config} />;
}
