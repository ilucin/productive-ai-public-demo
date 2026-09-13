# Productive AI — Shift 2026 public demo

A small public chat app that talks to Productive's AI agent harness (`ai-agent`), built for the
Shift 2026 talk so the audience can open it on their phones and ask the agent how it works. It is a
standalone Vite SPA on the same stack as Productive's client — React 19, TypeScript, Tailwind v4,
TanStack Query, Radix/shadcn-style primitives, `socket.io-client` — and nothing else of Productive.

## Run locally

```sh
nvm use          # Node 22, from .nvmrc
npm install
npm run dev      # http://localhost:5173/productive-ai-public-demo/
npm run build    # tsc -b && vite build → dist/ (plus dist/404.html for SPA fallback)
```

## Deploy

Every push to `main` runs `.github/workflows/deploy.yml`, which builds the site and publishes
`dist/` to GitHub Pages via `actions/deploy-pages`. The app is served from
<https://ilucin.github.io/productive-ai-public-demo/> (Vite `base` is set accordingly).
