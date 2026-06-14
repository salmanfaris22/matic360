import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Upload, KeyRound, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { staffApi } from "@/entities/staff/api";
import type { Staff, StaffFormValues } from "@/entities/staff/model";
import { StaffForm } from "@/features/staff-form/StaffForm";
import { apiErrorMessage } from "@/shared/api/client";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CenteredSpinner,
  ErrorState,
  Input,
  Label,
} from "@/shared/ui";

function toDateInput(iso?: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

function toFormValues(s: Staff): Partial<StaffFormValues> {
  return {
    name: s.name,
    designation: s.designation,
    phone: s.phone,
    secondary_phone: s.secondary_phone,
    email: s.email,
    dob: toDateInput(s.dob),
    joining_date: toDateInput(s.joining_date),
    address: s.address,
    aadhaar_number: s.aadhaar_number,
    pan_number: s.pan_number,
    salary: s.salary,
    status: s.status,
    shift_start: s.shift_start || "09:00",
    shift_end: s.shift_end || "17:00",
    employment_type: s.employment_type || "full_time",
    contract_end_date: toDateInput(s.contract_end_date),
    department_id: s.department_id ?? null,
    branch_id: s.branch_id ?? null,
  };
}

export default function StaffFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const staffQuery = useQuery({
    queryKey: ["staff", id],
    queryFn: () => staffApi.get(id!),
    enabled: isEdit,
  });

  const create = useMutation({
    mutationFn: (v: StaffFormValues) => staffApi.create(v),
    onSuccess: (s) => {
      toast.success("Staff created — you can now add photo & KYC images.");
      qc.invalidateQueries({ queryKey: ["staff"] });
      navigate(`/staff/${s.id}/edit`, { replace: true });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Create failed")),
  });

  const update = useMutation({
    mutationFn: (v: StaffFormValues) => staffApi.update(id!, v),
    onSuccess: () => {
      toast.success("Staff updated");
      qc.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Update failed")),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/staff")} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isEdit ? "Edit staff" : "Add staff"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit
              ? staffQuery.data?.employee_id
              : "Employee ID is generated automatically."}
          </p>
        </div>
      </div>

      {isEdit && staffQuery.isLoading ? (
        <CenteredSpinner label="Loading staff…" />
      ) : isEdit && staffQuery.isError ? (
        <ErrorState message="Staff not found." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <StaffForm
                defaultValues={isEdit && staffQuery.data ? toFormValues(staffQuery.data) : undefined}
                submitting={create.isPending || update.isPending}
                submitLabel={isEdit ? "Save changes" : "Create staff"}
                onSubmit={(v) => (isEdit ? update.mutate(v) : create.mutate(v))}
              />
            </CardContent>
          </Card>

          {isEdit && staffQuery.data && (
            <div className="space-y-6">
              <PortalAccess staff={staffQuery.data} />
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="text-base">Photo &amp; KYC</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <ImageUpload label="Profile photo" type="photo" staff={staffQuery.data} />
                  <ImageUpload label="Aadhaar image" type="aadhaar" staff={staffQuery.data} />
                  <ImageUpload label="PAN image" type="pan" staff={staffQuery.data} />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PortalAccess({ staff }: { staff: Staff }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState(staff.email ?? "");
  const [password, setPassword] = useState("");

  const create = useMutation({
    mutationFn: () => staffApi.createLogin(staff.id, { email, password }),
    onSuccess: () => {
      toast.success("Portal login created — staff can now sign in.");
      qc.invalidateQueries({ queryKey: ["staff", String(staff.id)] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not create login")),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    create.mutate();
  };

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4" /> Portal access
        </CardTitle>
      </CardHeader>
      <CardContent>
        {staff.user_id ? (
          <div className="flex items-center gap-2 rounded-md bg-[hsl(var(--success))]/10 p-3 text-sm text-[hsl(var(--success))]">
            <CheckCircle2 className="h-4 w-4" />
            Portal login active{staff.user?.email ? ` · ${staff.user.email}` : ""}
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Create a mobile-portal login so this staff member can check in and record collections.
            </p>
            <div className="space-y-1.5">
              <Label>Login email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Temporary password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                required
              />
            </div>
            <Button type="submit" className="w-full" loading={create.isPending}>
              Create portal login
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function ImageUpload({
  label,
  type,
  staff,
}: {
  label: string;
  type: "photo" | "aadhaar" | "pan";
  staff: Staff;
}) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const url =
    type === "photo" ? staff.photo_url : type === "aadhaar" ? staff.aadhaar_image_url : staff.pan_image_url;

  const onChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      await staffApi.uploadImage(staff.id, type, file);
      await qc.invalidateQueries({ queryKey: ["staff", String(staff.id)] });
      toast.success(`${label} uploaded`);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Upload failed"));
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
          {url ? (
            <img src={url} alt={label} className="h-full w-full object-cover" />
          ) : (
            <Upload className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <label className="flex-1">
          <span className="sr-only">{label}</span>
          <input
            type="file"
            accept="image/*"
            onChange={onChange}
            disabled={busy}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80"
          />
        </label>
      </div>
    </div>
  );
}
