import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { CenteredSpinner } from "@/shared/ui";
import { AppLayout } from "@/widgets/layout/AppLayout";
import { PortalLayout } from "@/widgets/portal/PortalLayout";
import { ProtectedRoute, GuestRoute, RoleRoute } from "./guards";

// Lazy-loaded pages → each becomes its own code-split chunk.
const LoginPage = lazy(() => import("@/pages/login/LoginPage"));
const DashboardPage = lazy(() => import("@/pages/dashboard/DashboardPage"));
const StaffListPage = lazy(() => import("@/pages/staff/StaffListPage"));
const StaffFormPage = lazy(() => import("@/pages/staff/StaffFormPage"));
const NotFoundPage = lazy(() => import("@/pages/misc/NotFoundPage"));

// Admin module pages
const AttendanceAdminPage = lazy(() => import("@/pages/attendance/AttendanceAdminPage"));
const PaymentsPage = lazy(() => import("@/pages/payments/PaymentsPage"));
const ExpensesPage = lazy(() => import("@/pages/expenses/ExpensesPage"));
const SalaryPage = lazy(() => import("@/pages/salary/SalaryPage"));
const CustomersPage = lazy(() => import("@/pages/customers/CustomersPage"));
const ProductsPage = lazy(() => import("@/pages/products/ProductsPage"));
const NewArrivalsPage = lazy(() => import("@/pages/newarrivals/NewArrivalsPage"));
const DamagePage = lazy(() => import("@/pages/damage/DamagePage"));
const OutstandingPage = lazy(() => import("@/pages/outstanding/OutstandingPage"));
const PickupsPage = lazy(() => import("@/pages/pickups/PickupsPage"));
const NotificationsPage = lazy(() => import("@/pages/notifications/NotificationsPage"));
const BranchesPage = lazy(() => import("@/pages/branches/BranchesPage"));
const DepartmentsPage = lazy(() => import("@/pages/departments/DepartmentsPage"));
const UsersPage = lazy(() => import("@/pages/users/UsersPage"));
const RolesPage = lazy(() => import("@/pages/roles/RolesPage"));

// Staff portal pages
const PortalHomePage = lazy(() => import("@/pages/portal/PortalHomePage"));
const PortalAttendancePage = lazy(() => import("@/pages/portal/PortalAttendancePage"));
const PortalMorePage = lazy(() => import("@/pages/portal/PortalMorePage"));

function Fallback() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <CenteredSpinner label="Loading…" />
    </div>
  );
}

const ADMINS = ["super_admin", "admin"];

export function AppRouter() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />

        {/* Staff Portal (mobile) — any authenticated user */}
        <Route
          path="/portal"
          element={
            <ProtectedRoute>
              <PortalLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<PortalHomePage />} />
          <Route path="attendance" element={<PortalAttendancePage />} />
          <Route path="me" element={<PortalMorePage />} />
        </Route>

        {/* Admin / Super Admin dashboard */}
        <Route
          element={
            <ProtectedRoute>
              <RoleRoute allow={ADMINS} redirect="/portal">
                <AppLayout />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="staff" element={<StaffListPage />} />
          <Route path="staff/new" element={<StaffFormPage />} />
          <Route path="staff/:id/edit" element={<StaffFormPage />} />
          <Route path="attendance" element={<AttendanceAdminPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="outstanding" element={<OutstandingPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="pickups" element={<PickupsPage />} />
          <Route path="salary" element={<SalaryPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="new-arrivals" element={<NewArrivalsPage />} />
          <Route path="damage" element={<DamagePage />} />
          <Route path="branches" element={<BranchesPage />} />
          <Route path="departments" element={<DepartmentsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="roles" element={<RolesPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>

        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Suspense>
  );
}
