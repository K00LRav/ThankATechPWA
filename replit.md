# ThankATech

A gratitude-first marketplace where customers thank technicians with heartfelt messages and optional tips after a job is completed. "Real thanks. Real tips. No ratings."

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/thankatech run dev` — run the frontend (port 19816)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes non-interactively; ideal for dev/reset flows — review before using on shared or production data
- `pnpm --filter @workspace/db run push-interactive` — push DB schema changes with confirmation prompts (for careful review before applying)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned)

## Fresh Environment Setup

After cloning or resetting the database, run these commands in order:

```bash
pnpm install
pnpm --filter @workspace/db run push
```

This applies the full schema (all tables and columns) without interactive prompts. The post-merge hook runs these steps automatically after every task merge.

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
- `lib/db/src/schema/` — Drizzle table definitions (auth, profiles, technicians, jobs, thanks, points)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/thankatech/src/pages/` — React pages (home, browse, technician-profile, customer-dashboard, technician-dashboard, thank-flow, login + onboard)
- `artifacts/thankatech/src/hooks/useMyProfile.ts` — fetches the authenticated user's profile (profileId, userType, technicianId)
- `lib/replit-auth-web/` — shared auth hook (`useAuth`) for browser OIDC login/logout state
- `artifacts/api-server/src/lib/auth.ts` — session management (create/get/delete/refresh)
- `artifacts/api-server/src/middlewares/authMiddleware.ts` — loads user from session on every request
- `artifacts/api-server/src/routes/auth.ts` — OIDC login/callback/logout/mobile-token-exchange routes
- `artifacts/api-server/src/routes/profile.ts` — GET/POST /profile/me (user's own profile)
- `artifacts/thankatech/src/components/layout/Navbar.tsx` — shared navbar

## Architecture decisions

- OpenAPI-first: all endpoints defined in `openapi.yaml`, codegen produces typed React Query hooks and Zod schemas
- Auth: Replit OIDC (cookie-based for web). Sessions stored in `sessions` table; users in `users` table
- Profile link: `profiles.user_id` and `technicians.user_id` (varchar) map auth users to their app profile
- New user onboarding: after first login, `/onboard` page lets them pick customer or technician role
- Dashboards use `GET /api/profile/me` to get the authenticated user's profileId/technicianId
- ThankYou Points awarded automatically when thank messages are submitted (+15 customer, +80 tech for received, +20 job, +50 tip)
- Brand: Primary #FF6B35 (warm orange), Secondary #166534 (deep green), off-white warm neutral backgrounds

## Product

- **Homepage** — Platform stats, recent thanks feed, hero with CTA
- **Browse** — Search/filter technicians by specialty or name
- **Technician Profile** — Bio, stats, Wall of Thanks (scrollable gratitude feed)
- **Customer Dashboard** — Jobs list by status, ThankYou Points balance
- **Technician Dashboard** — Incoming jobs, earnings, points, Wall of Thanks preview
- **Thank Flow** — 3-step animated flow: write message → add optional tip → celebration screen
- **Login** — Replit OIDC sign-in button; no email/password forms
- **Onboard** — Role selection (customer vs technician) shown to new users after first login

## User preferences

_Populate as needed._

## Gotchas

- Always run codegen after changing `openapi.yaml`: `pnpm --filter @workspace/api-spec run codegen`
- `thanks/recent` route must be registered BEFORE `thanks/:id` in Express to avoid route conflicts
- Technician ID 1 was deleted during seeding (duplicate); IDs start at 2
- Auth uses Replit OIDC — `REPL_ID` env var is used as the client_id (auto-set in Replit environment)
- Do NOT use generated API client hooks for auth operations — use `useAuth()` from `@workspace/replit-auth-web`
- Auth tables (`sessions`, `users`) are mandatory — do not drop them
- Stripe webhook: `stripe-replit-sync` does NOT register `account.updated` in the enabled events list. `initStripe()` in `artifacts/api-server/src/index.ts` detects this at startup and automatically updates the Stripe webhook endpoint to add any missing required events. No manual Stripe dashboard config is needed.

## GitHub

- Repo: `https://github.com/K00LRav/PWAThankATech` (primary mirror)
- Also mirrored to: `https://github.com/K00LRav/ThankATechPWA`
- Last verified push: HEAD `39c4032` on `main` (May 16 2026)
- Note: rotate any PAT used for the push via GitHub → Settings → Developer Settings → Personal Access Tokens

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
