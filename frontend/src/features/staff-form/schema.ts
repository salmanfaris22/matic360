import { z } from "zod";

export const staffSchema = z.object({
  employee_id: z.string().optional(),
  name: z.string().min(2, "Name is required"),
  designation: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  secondary_phone: z.string().optional().default(""),
  email: z.string().email("Invalid email").or(z.literal("")).optional().default(""),
  dob: z.string().optional().default(""),
  joining_date: z.string().optional().default(""),
  address: z.string().optional().default(""),
  aadhaar_number: z.string().optional().default(""),
  pan_number: z.string().optional().default(""),
  salary: z.coerce.number().min(0, "Must be ≥ 0").default(0),
  status: z.enum(["active", "inactive", "resigned", "terminated"]).default("active"),
  shift_start: z.string().optional().default("09:00"),
  shift_end: z.string().optional().default("17:00"),
  employment_type: z.enum(["full_time", "temporary", "contract"]).default("full_time"),
  contract_end_date: z.string().optional().default(""),
  department_id: z.coerce.number().nullable().optional(),
  branch_id: z.coerce.number().nullable().optional(),
});

export type StaffSchema = z.infer<typeof staffSchema>;
