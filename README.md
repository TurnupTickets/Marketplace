# Turnup Marketplace

Ticket marketplace storefront (TanStack Start + React), deployed as a static SPA on Cloudflare Workers.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Backend API

Set `VITE_API_URL` to the TurnupCms backend's **bare origin** — e.g.
`http://localhost:8080` for local Sail, with no `/api` suffix and no
version segment. `api/v1`, `api/marketplace/v1`, and `sanctum/csrf-cookie`
are three siblings off that origin, not nested under one shared prefix
(`src/lib/api/client.ts` derives all three from it). Leave it unset to run
against the built-in mock data instead of a real backend.

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
