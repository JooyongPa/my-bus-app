# Bus Stop (Next.js)

Minimal [Next.js](https://nextjs.org) app with TypeScript, Tailwind CSS, and the App Router.

## Structure

| Path | Purpose |
|------|---------|
| `src/app/` | Routes, layout, global styles |
| `src/components/` | UI building blocks |
| `src/lib/` | Helpers, API clients, constants |
| `src/types/` | Shared TypeScript types (e.g. `bus.ts`) |

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — dev server (Turbopack)
- `npm run build` — production build
- `npm run start` — serve production build
- `npm run lint` — ESLint
