# BOQ Pro

Professional **BOQ**, **Material Takeoff**, and **Construction Estimation** frontend for Pakistan — an area-based engineering calculator that runs entirely in the browser.

Enter covered area and project options. Everything else calculates automatically: quantities, materials, labour, equipment, rate analysis, BOQ, MTO, and exportable reports.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS 4, Framer Motion, Zustand |
| Engine | Shared TypeScript calculation package (`@boq/engine`) — deterministic formulas |
| Types | `@boq/shared` domain types |

No backend or database is required.

## Monorepo layout

```
apps/web           Next.js UI (client-side calc + localStorage + Report Center)
packages/engine    Engineering formulas + module registry
packages/shared    Shared domain types
```

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy on Vercel

1. Import this repository in [Vercel](https://vercel.com).
2. Set **Root Directory** to `apps/web`.
3. Enable **Include source files outside of the Root Directory** (needed for `packages/*`).
4. Install / Build commands come from `apps/web/vercel.json`.
5. Use Node.js 20+.
6. Redeploy and confirm `/`, `/calculator`, `/boq`, `/reports` load the BOQ Pro UI.

No environment variables are required for the default frontend-only deployment.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Next.js app |
| `npm run build` | Production build |
| `npm run type-check` | TypeScript check across packages |
| `npm run lint` | ESLint for the web app |
