import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { branchApi } from "@/entities/branch/api";
import { departmentApi } from "@/entities/department/api";
import { EMPLOYMENT_TYPES, STAFF_STATUSES, type StaffFormValues } from "@/entities/staff/model";
import { Button, Input, Label, Select } from "@/shared/ui";
import { staffSchema, type StaffSchema } from "./schema";

interface StaffFormProps {
  defaultValues?: Partial<StaffFormValues>;
  onSubmit: (values: StaffFormValues) => void;
  submitting?: boolean;
  submitLabel?: string;
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function StaffForm({
  defaultValues,
  onSubmit,
  submitting,
  submitLabel = "Save",
}: StaffFormProps) {
  const { data: branches } = useQuery({ queryKey: ["branches"], queryFn: branchApi.list });
  const { data: departments } = useQuery({ queryKey: ["departments"], queryFn: departmentApi.list });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StaffSchema>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      status: "active",
      salary: 0,
      shift_start: "09:00",
      shift_end: "17:00",
      employment_type: "full_time",
      contract_end_date: "",
      ...defaultValues,
      department_id: defaultValues?.department_id ?? undefined,
      branch_id: defaultValues?.branch_id ?? undefined,
    },
  });

  const submit = handleSubmit((values) => {
    onSubmit({
      ...values,
      department_id: values.department_id ? Number(values.department_id) : null,
      branch_id: values.branch_id ? Number(values.branch_id) : null,
    } as StaffFormValues);
  });

  return (
    <form onSubmit={submit} className="space-y-8">
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">Personal details</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Full name" error={errors.name?.message}>
            <Input placeholder="Ramesh Kumar" {...register("name")} />
          </Field>
          <Field label="Designation">
            <Input placeholder="Sales Executive" {...register("designation")} />
          </Field>
          <Field label="Status">
            <Select {...register("status")}>
              {STAFF_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Phone">
            <Input placeholder="9876543210" {...register("phone")} />
          </Field>
          <Field label="Secondary phone">
            <Input placeholder="Optional" {...register("secondary_phone")} />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <Input type="email" placeholder="name@example.com" {...register("email")} />
          </Field>
          <Field label="Date of birth">
            <Input type="date" {...register("dob")} />
          </Field>
          <Field label="Address">
            <Input placeholder="Street, City" {...register("address")} />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">Employment</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Branch">
            <Select {...register("branch_id")}>
              <option value="">— Select branch —</option>
              {branches?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Department">
            <Select {...register("department_id")}>
              <option value="">— Select department —</option>
              {departments?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Joining date">
            <Input type="date" {...register("joining_date")} />
          </Field>
          <Field label="Salary (₹)" error={errors.salary?.message}>
            <Input type="number" step="0.01" min="0" {...register("salary")} />
          </Field>
          <Field label="Employment type">
            <Select {...register("employment_type")}>
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Contract end date (optional)">
            <Input type="date" {...register("contract_end_date")} />
          </Field>
          <Field label="Shift start">
            <Input type="time" {...register("shift_start")} />
          </Field>
          <Field label="Shift end">
            <Input type="time" {...register("shift_end")} />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">KYC</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Aadhaar number">
            <Input placeholder="1234 5678 9012" {...register("aadhaar_number")} />
          </Field>
          <Field label="PAN number">
            <Input placeholder="ABCDE1234F" {...register("pan_number")} />
          </Field>
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
