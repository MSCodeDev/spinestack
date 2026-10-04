# SpineStack

A self-hosted manager for your physical book collection, built with SvelteKit.

- **One page for the whole library**: a stats header, search, and a list you can sort, filter and group.
- **Three views**: covers (default), table, and stacked (books piled on top of each other).
- **Add books** by title and author, by ISBN, or by scanning the barcode with your phone's camera. Covers are downloaded automatically, and you can search for a different one or upload your own.
- **Everything else is a modal**: view and edit a book, add books, and settings.
- **Locations** (room, shelf…), tags, series, publishers and reading history.
- **Multiple users**, each with their own library. The first account is the administrator.

Book data comes from [Open Library](https://openlibrary.org) and, if you provide a key, Google Books.

## Running with Docker

```sh
cp .env.example .env     # set BETTER_AUTH_SECRET and ORIGIN
docker compose up -d
```

Open the app at your `ORIGIN` (default `http://localhost:3000`) and create the administrator account.

Everything lives in the `/data` volume: the SQLite database (`spinestack.db`) and cover images (`covers/`). Back that directory up.

Camera scanning needs a secure context, so use HTTPS (or `localhost`) when scanning from a phone.

## Configuration

| Variable                         | Default                   | Purpose                                                                                                                 |
| -------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET`             | _(required)_              | Signs sessions. Generate with `openssl rand -hex 32`.                                                                   |
| `ORIGIN`                         |                           | Public URL of the app. Its protocol is used for form security checks.                                                   |
| `DATA_DIR`                       | `./data`                  | Where the database and covers are stored (`/data` in Docker).                                                           |
| `DATABASE_URL`                   | `$DATA_DIR/spinestack.db` | Path of the SQLite file.                                                                                                |
| `GOOGLE_BOOKS_API_KEY`           |                           | Enables Google Books lookups. Google rejects keyless requests, so without a key only Open Library is used.              |
| `PORT`, `HOST`                   | `3000`, `0.0.0.0`         | Where the server listens.                                                                                               |
| `PROTOCOL_HEADER`, `HOST_HEADER` |                           | Behind a reverse proxy, set to `x-forwarded-proto` and `x-forwarded-host`. Takes the place of `ORIGIN` for form checks. |

## Development

```sh
cp .env.example .env     # set BETTER_AUTH_SECRET
npm install
npm run dev
```

The database is created and migrated on first start.

| Script                | Purpose                                        |
| --------------------- | ---------------------------------------------- |
| `npm run dev`         | Start the dev server                           |
| `npm run build`       | Production build                               |
| `npm start`           | Run the production build                       |
| `npm run check`       | Type-check                                     |
| `npm run lint`        | Check formatting and lint                      |
| `npm run format`      | Format                                         |
| `npm test`            | Unit tests                                     |
| `npm run test:e2e`    | Browser tests (Playwright)                     |
| `npm run db:generate` | Generate a migration after changing the schema |

End-to-end tests need a browser: `npx playwright install --with-deps chromium`.

### Layout

- `src/lib/server/` – database, auth, book services, metadata providers, cover storage
- `src/lib/components/` – UI, including the modals under `settings/`
- `src/lib/library/query.ts` – the list's search, filter, sort and group state, shared by client and server and kept in the URL
- `src/routes/(app)/` – the library page; `src/routes/api/` – JSON endpoints
- `drizzle/` – SQL migrations, applied on startup
