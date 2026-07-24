# BOQ Pro

Professional **BOQ**, **Material Takeoff**, and **Construction Estimation** web app for Pakistan — an advanced engineering calculator, not a project-management or ERP system.

Enter measurements. Everything else calculates automatically: quantities, materials, labour, equipment, rate analysis, BOQ, MTO, and exportable reports.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS 4, Framer Motion, Zustand, Recharts |
| Backend (optional) | NestJS, Prisma, PostgreSQL |
| Engine | Shared TypeScript calculation package (`@boq/engine`) — deterministic formulas |
| Geometry | Smart House Planner (`@boq/geometry`) — vector floor plans → measurements |

## Monorepo layout

```
apps/web              Next.js UI (client-side calc + localStorage + Report Center)
apps/api              NestJS API (optional cost DB sync)
packages/engine       Engineering formulas + module registry
packages/shared       Shared domain types
packages/geometry     Planner geometry + house template library
```

## Quick start

### 1. Install

```bash
npm install
```

### 2. Run the web app (works offline)

Calculations and rates ship embedded — no database required for daily use.

```bash
npm run dev:web
```

Open [http://localhost:3000](http://localhost:3000).

### 3. Optional: API + PostgreSQL

```bash
docker compose up -d
cp apps/api/.env.example apps/api/.env
npm run db:setup
npm run dev:api
```

API: [http://localhost:4000/api/health](http://localhost:4000/api/health)

Set `NEXT_PUBLIC_API_URL` only if the API is hosted separately (see `apps/web/.env.example`).

## Deploy on Vercel

Use **two** Vercel projects from the same repo (web is required; API is optional for Rates sync).

### Web project (`apps/web`)

1. Import this repository in [Vercel](https://vercel.com).
2. Set **Root Directory** to `apps/web`.
3. Install / Build commands come from `apps/web/vercel.json` (`npm install` + `npm run build:web` from the repo root).
4. Node.js 20+ (see `.nvmrc`).
5. Environment variable (optional — enables Rates → Sync API):

   | Variable | Example |
   |----------|---------|
   | `NEXT_PUBLIC_API_URL` | `https://boq-generator-api-5nz3.vercel.app/api` |

   Leave unset for a fully offline production build (BOQ, planner, MTO, Report Center still work).

### API project (`apps/api`) — optional

1. Create a **second** Vercel project from the same repo.
2. Set **Root Directory** to `apps/api` (`apps/api/vercel.json` builds shared + engine + Prisma + Nest).
3. Environment variables:

   | Variable | Notes |
   |----------|--------|
   | `CORS_ORIGIN` | Comma-separated web origins, e.g. `https://your-web.vercel.app`. If unset, localhost + `*.vercel.app` are allowed. |
   | `DATABASE_URL` | Optional PostgreSQL. Without it, cost-database returns embedded defaults. |

4. Confirm `GET /` returns service JSON and `GET /api/health` returns `ok`.

NestJS on Vercel is best-effort serverless; for a long-running API prefer Railway/Render/Fly.

## Dual measurement workflows

1. **Manual Measurement** (`/measure`) — enter dimensions per construction module.
2. **Smart House Planner** (`/planner`) — draw/edit a floor plan; geometry converts into the same `MeasurementEntry` objects the BOQ engine consumes.

Flow: Drawing → Geometry → Measurements → `@boq/engine` → BOQ / MTO / Rates / Reports.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:web` | Next.js dev server |
| `npm run dev:api` | NestJS watch mode |
| `npm run build:web` | Production web build (Vercel) |
| `npm run build` | Build all packages/apps |
| `npm run type-check` | TypeScript check (packages + web) |
| `npm run lint` | ESLint (web) |
| `npm run db:setup` | Prisma generate + push + seed |

## Notes

- Quantities are always produced by **deterministic engineering formulas**, not AI.
- Default rates are **indicative PKR market values** — edit them for your city/project.
- Project state persists in the browser (`localStorage`). No login in v1.
- Report Center generates Excel, Word, and PDF **in the browser** (no API required).
