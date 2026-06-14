import type { Branch } from "@/entities/branch/api";
import type { Department } from "@/entities/department/api";

export type StaffStatus = "active" | "inactive" | "resigned" | "terminated";
export type EmploymentType = "full_time" | "temporary" | "contract";

export interface Staff {
  id: number;
  employee_id: string;
  name: string;
  phone: string;
  secondary_phone: string;
  email: string;
  dob?: string | null;
  address: string;
  aadhaar_number: string;
  pan_number: string;
  photo_url: string;
  aadhaar_image_url: string;
  pan_image_url: string;
  joining_date?: string | null;
  designation: string;
  salary: number;
  status: StaffStatus;
  shift_start: string;
  shift_end: string;
  employment_type: EmploymentType;
  contract_end_date?: string | null;
  department_id?: number | null;
  branch_id?: number | null;
  user_id?: number | null;
  department?: Department | null;
  branch?: Branch | null;
  user?: { id: number; email: string; name: string } | null;
  created_at: string;
}

export interface StaffFormValues {
  employee_id?: string;
  name: string;
  phone: string;
  secondary_phone: string;
  email: string;
  dob: string;
  address: string;
  aadhaar_number: string;
  pan_number: string;
  joining_date: string;
  designation: string;
  salary: number;
  status: StaffStatus;
  shift_start: string;
  shift_end: string;
  employment_type: EmploymentType;
  contract_end_date: string;
  department_id?: number | null;
  branch_id?: number | null;
}

export const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
  { value: "full_time", label: "Full time" },
  { value: "temporary", label: "Temporary" },
  { value: "contract", label: "Contract" },
];

export const STAFF_STATUSES: { value: StaffStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "resigned", label: "Resigned" },
  { value: "terminated", label: "Terminated" },
];
