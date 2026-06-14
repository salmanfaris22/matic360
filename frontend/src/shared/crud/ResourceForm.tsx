import { useForm } from "react-hook-form";
import { Button, Input, Label, Select } from "@/shared/ui";
import type { FieldOption, LookupKey, ResourceConfig, ResourceField } from "./resource";

interface ResourceFormProps {
  config: ResourceConfig;
  initial?: Record<string, unknown> | null;
  lookups: Record<LookupKey, FieldOption[]>;
  submitting?: boolean;
  onSubmit: (values: Record<string, unknown>) => void;
  onCancel: () => void;
}

function defaultFor(field: ResourceField, initial?: Record<string, unknown> | null) {
  const raw = initial?.[field.name];
  if (field.type === "date" && typeof raw === "string") return raw.slice(0, 10);
  if (field.type === "checkbox") return Boolean(raw);
  if (raw === null || raw === undefined) return field.type === "number" ? 0 : "";
  return raw;
}

export function ResourceForm({
  config,
  initial,
  lookups,
  submitting,
  onSubmit,
  onCancel,
}: ResourceFormProps) {
  const formFields = config.fields.filter((f) => f.inForm !== false);

  const defaults: Record<string, unknown> = {};
  formFields.forEach((f) => (defaults[f.name] = defaultFor(f, initial)));

  const { register, handleSubmit } = useForm({ defaultValues: defaults });

  const submit = handleSubmit((values) => {
    const out: Record<string, unknown> = { ...values };
    // Normalize lookup selects (numeric id or null) and empty numbers.
    formFields.forEach((f) => {
      if (f.lookup || (f.type === "select" && f.options?.some((o) => typeof o.value === "number"))) {
        const v = out[f.name];
        out[f.name] = v === "" || v === undefined ? null : Number(v);
      }
    });
    onSubmit(out);
  });

  const optionsFor = (f: ResourceField): FieldOption[] =>
    f.lookup ? lookups[f.lookup] ?? [] : f.options ?? [];

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {formFields.map((f) => (
          <div
            key={f.name}
            className={`flex flex-col gap-1.5 ${f.type === "textarea" ? "sm:col-span-2" : ""}`}
          >
            <Label>{f.label}</Label>
            {f.type === "select" ? (
              <Select {...register(f.name)}>
                <option value="">— Select —</option>
                {optionsFor(f).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            ) : f.type === "textarea" ? (
              <textarea
                {...register(f.name)}
                rows={3}
                placeholder={f.placeholder}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            ) : f.type === "checkbox" ? (
              <input type="checkbox" {...register(f.name)} className="h-5 w-5 rounded border-input" />
            ) : (
              <Input
                type={
                  f.type === "number"
                    ? "number"
                    : f.type === "date"
                      ? "date"
                      : f.type === "password"
                        ? "password"
                        : "text"
                }
                step={f.step}
                placeholder={f.placeholder}
                {...register(f.name, f.type === "number" ? { valueAsNumber: true } : {})}
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          Save
        </Button>
      </div>
    </form>
  );
}
