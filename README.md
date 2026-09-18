# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

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
