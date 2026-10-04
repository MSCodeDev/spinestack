# SpineStack

A self-hosted physical book collection manager, built with SvelteKit.

## Development

```sh
cp .env.example .env   # set BETTER_AUTH_SECRET
npm install
npm run db:push
npm run dev
```

## Scripts

| Script                            | Purpose               |
| --------------------------------- | --------------------- |
| `npm run dev`                     | Start the dev server  |
| `npm run build`                   | Production build      |
| `npm run check`                   | Type-check            |
| `npm run lint` / `npm run format` | Lint / format         |
| `npm test`                        | Run unit tests        |
| `npm run db:push`                 | Sync schema to SQLite |

E2E tests need browsers: `npx playwright install --with-deps chromium`.
