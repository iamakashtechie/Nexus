# Nexus

Your personal knowledge base. Minimal, private, self-hosted.

Built with Next.js 14, TypeScript, Tailwind CSS, TipTap, Prisma, and Neon PostgreSQL.

---

## Features

- 📱 **Mobile-First & PWA**: Fully functional Progressive Web App with optimized mobile UI, right-side navigation, and bottom sheet actions.
- 🔒 **Secure Auth**: Hashed password authentication with robust rate-limiting and security measures.
- 📝 **Dual Editor Modes**: Support for standard Markdown and rich-text editing (TipTap) with unsaved changes protection.
- 📤 **Advanced Export**: Export notes in Markdown, PDF, or batch ZIP format.
- ☁️ **Cloud Native**: PostgreSQL on Neon DB with auto-deployment to Vercel.
- ⚡ **Smart Routing**: Edge-compatible middleware with automatic root redirects.

---

## Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Framework   | Next.js 14 (App Router)           |
| Language    | TypeScript                        |
| Styling     | Tailwind CSS + CSS variables      |
| Editor      | TipTap (Markdown + rich text)     |
| Diagrams    | Mermaid.js                        |
| Highlighting| Shiki                             |
| Auth        | JWT + single env passphrase       |
| ORM         | Prisma                            |
| Database    | Neon PostgreSQL (free)            |
| Hosting     | Vercel (free)                     |
| Testing     | Vitest + Playwright               |
| CI/CD       | GitHub Actions                    |

---

## Local Setup

### 1. Clone and install

```bash
git clone https://github.com/yourusername/nexus
cd nexus
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:
- `DATABASE_URL` — your Neon connection string from https://console.neon.tech
- `APP_PASSWORD` — the passphrase you want to use to log in
- `JWT_SECRET` — generate with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```

### 3. Set up the database

```bash
npm run db:migrate     # creates tables from schema
npm run db:generate    # generates Prisma client
```

### 4. Run the dev server

```bash
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`.

---

## Testing

```bash
npm test              # unit tests (Vitest)
npm run test:ui       # Vitest with browser UI
npm run test:e2e      # end-to-end (Playwright)
npm run test:e2e:ui   # Playwright with browser UI
```

---

## Deployment (Vercel)

1. Push to GitHub
2. Import project on https://vercel.com
3. Add environment variables in Vercel dashboard:
   - `DATABASE_URL`
   - `APP_PASSWORD`
   - `JWT_SECRET`
4. Deploy — done

Every `git push` to `main` auto-deploys via Vercel.

---

## Database Management

```bash
npm run db:studio     # visual database browser (Prisma Studio)
npm run db:migrate    # run new migrations
npm run db:push       # push schema changes without migration (dev only)
```

---

## Documentation

For further information on architecture, database workflows, and upcoming features, refer to the following files:
- **[`CLAUDE.md`](./CLAUDE.md)** — Architectural decisions, frontend/backend routing logic, and guidelines for AI assistants navigating the codebase.
- **[`MIGRATION.md`](./MIGRATION.md)** — Comprehensive guide covering the database migration to Neon DB, along with Prisma schema drift fallback strategies.
- **[`TODO.md`](./TODO.md)** — Current tasks, planned features, and remaining technical debt to track.

---

## Project Structure

```
nexus/
├── src/
│   ├── app/
│   │   ├── (auth)/login/         # Login page
│   │   ├── (app)/notes/          # Main notes page
│   │   ├── api/
│   │   │   ├── auth/             # POST /api/auth
│   │   │   └── notes/            # GET, POST /api/notes
│   │   │       └── [id]/         # GET, PATCH, DELETE /api/notes/:id
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── components/
│   │   ├── editor/               # TipTap editor
│   │   ├── layout/               # Sidebar, header
│   │   └── ui/                   # ThemeProvider, buttons, inputs
│   ├── hooks/                    # useApi
│   ├── lib/                      # db, auth, validations
│   ├── middleware.ts              # JWT route protection
│   └── types/                    # Shared TypeScript types
├── prisma/
│   └── schema.prisma
├── tests/
│   ├── unit/                     # Vitest unit tests
│   ├── e2e/                      # Playwright E2E tests
│   └── setup.ts
├── .github/workflows/ci.yml      # GitHub Actions CI
├── .env.example
└── README.md
```
