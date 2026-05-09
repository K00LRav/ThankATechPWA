# ThankATech

A gratitude-first marketplace where customers thank technicians with heartfelt messages and optional tips after a job is completed. "Real thanks. Real tips. No ratings."

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/thankatech run dev` — run the frontend (port 19816)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Wouter + TanStack Query + Framer Motion
- UI: Tailwind CSS + shadcn/ui, Fonts: Inter + Playfair Display
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle table definitions (profiles, technicians, jobs, thanks, points)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/thankatech/src/pages/` — React pages (home, browse, technician-profile, customer-dashboard, technician-dashboard, thank-flow, login)
- `artifacts/thankatech/src/components/layout/Navbar.tsx` — shared navbar

## Architecture decisions

- OpenAPI-first: all endpoints defined in `openapi.yaml`, codegen produces typed React Query hooks and Zod schemas
- ThankYou Points awarded automatically when thank messages are submitted (+15 customer, +80 tech for received, +20 job, +50 tip)
- Demo user IDs hardcoded (customerId=1, technicianId=2) until auth is added
- Brand: Primary #FF6B35 (warm orange), Secondary #166534 (deep green), off-white warm neutral backgrounds

## Product

- **Homepage** — Platform stats, recent thanks feed, hero with CTA
- **Browse** — Search/filter technicians by specialty or name
- **Technician Profile** — Bio, stats, Wall of Thanks (scrollable gratitude feed)
- **Customer Dashboard** — Jobs list by status, ThankYou Points balance
- **Technician Dashboard** — Incoming jobs, earnings, points, Wall of Thanks preview
- **Thank Flow** — 3-step animated flow: write message → add optional tip → celebration screen
- **Login/Register** — Auth UI (customer vs technician selection)

## User preferences

_Populate as needed._

## Gotchas

- Always run codegen after changing `openapi.yaml`: `pnpm --filter @workspace/api-spec run codegen`
- `thanks/recent` route must be registered BEFORE `thanks/:id` in Express to avoid route conflicts
- Technician ID 1 was deleted during seeding (duplicate); IDs start at 2

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
