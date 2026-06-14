import { useQueries } from "@tanstack/react-query";
import { lookupsApi } from "@/entities/lookups/api";
import type { FieldOption, LookupKey, ResourceField } from "./resource";

// Loads option lists for any `lookup` fields referenced by a resource config.
export function useLookups(fields: ResourceField[]): Record<LookupKey, FieldOption[]> {
  const keys = Array.from(
    new Set(fields.map((f) => f.lookup).filter((k): k is LookupKey => Boolean(k))),
  );

  const results = useQueries({
    queries: keys.map((key) => ({
      queryKey: ["lookup", key],
      queryFn: () => lookupsApi[key](),
      staleTime: 60_000,
    })),
  });

  const map = {
    branches: [],
    departments: [],
    customers: [],
    products: [],
    roles: [],
  } as Record<LookupKey, FieldOption[]>;
  keys.forEach((key, i) => {
    map[key] = (results[i].data ?? []).map((item) => ({
      value: item.id,
      label: item.name,
    }));
  });
  return map;
}
