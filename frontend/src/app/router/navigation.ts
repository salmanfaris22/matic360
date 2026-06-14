import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Store,
  Wallet,
  ReceiptIndianRupee,
  BadgeIndianRupee,
  Fuel,
  Truck,
  PackageX,
  Boxes,
  Sparkles,
  Building2,
  Network,
  ShieldCheck,
  UserCog,
  Bell,
  type LucideIcon,
} from "lucide-react";
import type { RoleSlug } from "@/entities/auth/model";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  roles?: RoleSlug[]; // if set, only these roles see the item
  ready?: boolean; // true = fully built; false = placeholder
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

// Single source of truth for sidebar + routes.
export const navGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", path: "/", icon: LayoutDashboard, ready: true }],
  },
  {
    title: "Operations",
    items: [
      { label: "Staff", path: "/staff", icon: Users, ready: true },
      { label: "Attendance", path: "/attendance", icon: CalendarCheck, ready: true },
      { label: "Clients", path: "/customers", icon: Store, ready: true },
      { label: "Outstanding", path: "/outstanding", icon: Wallet, ready: true },
      { label: "Payments", path: "/payments", icon: ReceiptIndianRupee, ready: true },
      { label: "Pickups", path: "/pickups", icon: Truck, ready: true },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Salary", path: "/salary", icon: BadgeIndianRupee, ready: true },
      { label: "Expenses", path: "/expenses", icon: Fuel, ready: true },
    ],
  },
  {
    title: "Inventory",
    items: [
      { label: "Products", path: "/products", icon: Boxes, ready: true },
      { label: "New Arrivals", path: "/new-arrivals", icon: Sparkles, ready: true },
      { label: "Damage Items", path: "/damage", icon: PackageX, ready: true },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Branches", path: "/branches", icon: Building2, roles: ["super_admin", "admin"], ready: true },
      {
        label: "Departments",
        path: "/departments",
        icon: Network,
        roles: ["super_admin", "admin"],
        ready: true,
      },
      { label: "Roles", path: "/roles", icon: ShieldCheck, roles: ["super_admin"], ready: true },
      { label: "Users", path: "/users", icon: UserCog, roles: ["super_admin", "admin"], ready: true },
      { label: "Notifications", path: "/notifications", icon: Bell, ready: true },
    ],
  },
];

// Flatten for routing.
export const allNavItems: NavItem[] = navGroups.flatMap((g) => g.items);
