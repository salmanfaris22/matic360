# Distribution Company Management System

A full-stack management system for a distribution company — staff, attendance,
customers, outstanding/credit, payments, salary, expenses, pickups, damage items,
products and more — with **Super Admin / Admin / Staff** roles and a
mobile-friendly portal.

> **Status:** Foundation build. The **Staff** module is wired end-to-end (API + UI
> + image uploads). All 17 data models exist with auto-migration, and every other
> module is scaffolded behind the same proven pattern (marked “soon” in the UI).

---

## Tech stack

| Layer        | Technology                                                        |
| ------------ | ----------------------------------------------------------------- |
| Frontend     | React + Vite + TypeScript, **Feature-Sliced Design**, lazy routes |
| Styling/UI   | Tailwind CSS v4 + shadcn-style components, **dark / light** mode  |
| State / Data | TanStack Query + Zustand, Axios w/ JWT-refresh interceptor        |
| Backend      | Go + **Fiber**, **GORM + auto-migration**, modular architecture   |
| Database     | PostgreSQL                                                        |
| Auth         | JWT access + refresh tokens, RBAC (role + permission)             |
| Storage      | Local disk behind an S3-ready `Storage` interface                 |
| Integrations | Stubbed `Notifier` (WhatsApp/Email/SMS) + map coords             |

---

## Project layout

```
pro1/
├─ backend/                 Go API (Fiber + GORM)
│  ├─ cmd/api/              entrypoint (main.go)
│  └─ internal/
│     ├─ config/           env-based configuration
│     ├─ database/         connect, auto-migrate, seed
│     ├─ models/           all 17 GORM entities
│     ├─ middleware/       JWT auth + RBAC
│     ├─ modules/          auth, user, role, department, branch, staff, dashboard
│     ├─ server/           Fiber app + route wiring
│     └─ shared/           response, pagination, storage, notifier, security, validation
├─ frontend/                React app (FSD layers)
│  └─ src/
│     ├─ app/              providers, router (lazy), styles, theme
│     ├─ pages/            route pages (lazy-loaded chunks)
│     ├─ widgets/          sidebar, header, layout shell
│     ├─ features/         auth, theme toggle, staff form
│     ├─ entities/         auth/session, staff, branch, department, dashboard
│     └─ shared/           api client, ui kit, lib, stores, hooks
├─ docker-compose.yml       postgres + backend + frontend
└─ README.md
```

---

## Quick start

### Option A — Docker (one command)

```bash
docker compose up --build
```

- Frontend → http://localhost:8081
- Backend API → http://localhost:8080
- Postgres → localhost:5432

### Option B — Local dev (hot reload)

**1. Start PostgreSQL** (Docker shortcut):

```bash
docker run --name dms-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=distribution \
  -p 5432:5432 -d postgres:16-alpine
```

**2. Backend:**

```bash
cd backend
cp .env.example .env          # adjust if needed
go run ./cmd/api               # auto-migrates + seeds on first run
# → http://localhost:8080
```

**3. Frontend:**

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
# → http://localhost:5173  (Vite proxies /api and /uploads to :8080)
```

---

## Default login (seeded on first run)

| Field    | Value                     |
| -------- | ------------------------- |
| Email    | `superadmin@company.com`  |
| Password | `ChangeMe@123`            |

Change these via `SEED_SUPERADMIN_*` env vars before first run, or rotate after.

---

## API overview

Base path: `/api/v1`

| Method | Endpoint              | Notes                              |
| ------ | --------------------- | ---------------------------------- |
| POST   | `/auth/login`         | email + password → token pair      |
| POST   | `/auth/refresh`       | refresh token → new access token   |
| GET    | `/auth/me`            | current user (protected)           |
| GET    | `/dashboard/summary`  | headline counts                    |
| GET    | `/staff`              | list (search, pagination, filters) |
| POST   | `/staff`              | create                             |
| PUT    | `/staff/:id`          | update                             |
| DELETE | `/staff/:id`          | delete                             |
| POST   | `/staff/:id/upload`   | multipart photo / aadhaar / pan    |
| —      | `/users` `/roles` `/branches` `/departments` | CRUD (role-gated)   |

All non-auth routes require `Authorization: Bearer <access_token>`.

---

## Roles & permissions

- **Super Admin** — full access (`*` permission).
- **Admin** — operations: staff, customers, attendance, approvals, products…
- **Staff** — self check-in, payments, expenses, assigned pickups, salary status.

RBAC is enforced by `middleware.RequireRole(...)` and
`middleware.RequirePermission("staff.read")` etc. Role permission lists are stored
as JSON on the `roles` table and seeded on first run.

---

## Going to production

- **Storage:** set `STORAGE_DRIVER=s3` and fill `S3_*` env vars, then implement
  the two methods in `backend/internal/shared/storage/s3.go` (AWS SDK). No call
  sites change — the `Storage` interface is already wired throughout.
- **Notifications:** implement a real `Notifier` (WhatsApp/Email/SMS) and swap the
  `LogNotifier` — interface is in `backend/internal/shared/notifier`.
- **Secrets:** override all `JWT_*` and DB credentials via environment.

---

## Roadmap (next modules, same pattern)

Attendance · Customers · Outstanding · Payments (approval flow) · Salary ·
Expenses · Pickups · Damage Items · Products & New Arrivals · Notifications ·
Reports. Phase 2: Flutter app, route planning, live GPS, biometric attendance,
WhatsApp reminders, AI analytics.

# matic360
