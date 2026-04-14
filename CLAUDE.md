# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nexus is a personal knowledge base / note-taking app. Single-user, self-hosted. Minimal, private. Built with Next.js App Router, TypeScript, Tailwind CSS, TipTap, Prisma, and Neon PostgreSQL. It features full Progressive Web App (PWA) compatibility, a mobile-first design, and secure routing.

## Commands

```bash
npm run dev            # Start dev server (http://localhost:3000)
npm run build          # Production build
npm run lint           # ESLint
npm test               # Vitest unit tests (--run flag for single run)
npm run test:ui        # Vitest with browser UI
npm run test:e2e       # Playwright E2E tests (starts dev server automatically)
npm run test:e2e:ui    # Playwright with browser UI
npm run db:migrate     # Run Prisma migrations (uses .env.local)
npm run db:push        # Push schema changes without migration (dev only)
npm run db:studio      # Prisma Studio visual browser
npm run db:generate     # Regenerate Prisma client
```

All `db:*` commands use `dotenv -e .env.local` to load environment variables.

## Architecture

### Auth Flow

- **Secure Single-Password Auth**: No user accounts. Login securely hashes and compares against the `APP_PASSWORD` env var, paired with rate-limiting and lockout mechanisms to prevent brute-force attacks.
- **JWT tokens** (`jose` library, HS256, 15min expiry) stored in `localStorage` as `nexus_token`.
- **Dual auth**: API routes check `Authorization: Bearer <token>` header. Page routes check `nexus_token` httpOnly cookie (set on login).
- **Middleware** (`src/proxy.ts`): Edge-compatible middleware. Public paths: `/login`, `/api/auth`. All other routes require valid JWT.
- **SessionGuard** (`src/components/SessionGuard.tsx`): Client-side 15-min session timeout with periodic + interaction-based checks.

### API Routes

All routes follow `ApiResponse<T>` envelope: `{ success: true, data: T }` or `{ success: false, error: string }`.

| Route | Methods | Notes |
|---|---|---|
| `/api/auth` | POST | Login (password check → JWT) |
| `/api/auth/logout` | POST | Clears httpOnly cookie |
| `/api/notes` | GET, POST | GET supports `?q=`, `?notebookId=`, `?tag=` filters |
| `/api/notes/[id]` | GET, PATCH, DELETE | PATCH handles fileType/markdownContent auto-patching |
| `/api/notes/[id]/download` | GET | Returns raw file for download |
| `/api/notebooks` | GET, POST | |
| `/api/notebooks/[id]` | PATCH, DELETE | |
| `/api/notebooks/[id]/download` | GET | Returns ZIP of all notes in notebook |

### Data Model (Prisma)

- **Note**: id, title, fileType (default `.md`), content (Json - TipTap doc), markdownContent (nullable), pinned, notebookId (nullable FK), tags via NoteTag join
- **Notebook**: id, name, has many Notes
- **Tag**: id, name (unique), joined to Notes via NoteTag
- **NoteTag**: Composite PK (noteId + tagId), cascade deletes

### Frontend Architecture

- **Progressive Web App (PWA)**: Fully installable with service workers, manifest files, and comprehensive mobile-first design features including right-side navigation and bottom sheet actions for folders.
- **Single-page notes app** (`src/app/(app)/notes/page.tsx`): Complex client component managing state for the note list, editor, notebooks/folders, context menus, auto-save, unsaved-changes protection, and exports (Markdown/PDF/ZIP).
- **Editor** (`src/components/editor/Editor.tsx`): TipTap with StarterKit + CodeBlockLowlight (JS, TS, Python, Bash, CSS). Dynamically imported (no SSR).
- **Dual editing modes**: Markdown notes use a plain `<textarea>` for editing + ReactMarkdown for viewing. Rich-text notes use TipTap.
- **Auto-save**: Debounced 1s save with field accumulation (`pendingPayloadRef`). Manual save option and route-change protections when auto-save is disabled.
- **Theme**: 5 themes (light, dark, offwhite, dim, system) via ThemeProvider context + CSS variables in `globals.css`.

### Key Lib Modules

- `src/lib/auth.ts`: JWT sign/verify with `jose`. `extractToken()` helper for Bearer header parsing.
- `src/lib/db.ts`: Singleton PrismaClient with dev query logging.
- `src/lib/validations.ts`: Zod schemas for login, createNote, updateNote, createNotebook, noteId.
- `src/lib/fileType.ts`: File type detection/normalization from note titles. Notes with `.md` extension get markdown mode; others get TipTap rich text.
- `src/lib/backup.ts`: Builds download filenames and extracts plain text from TipTap JSON content for file downloads.
- `src/lib/zip.ts`: Pure-Zip implementation (no external deps) for notebook ZIP downloads. Uses CRC32 + local/central directory headers.

### Environment Variables

- `DATABASE_URL`: Neon pooled connection (used by Prisma at runtime)
- `DIRECT_URL`: Neon direct connection (used by `prisma migrate`)
- `APP_PASSWORD`: Login passphrase
- `JWT_SECRET`: Random hex for signing JWTs

### Path Aliases

`@/*` maps to `./src/*` (configured in both tsconfig.json and vitest.config.ts).

### Production Quirks

The PATCH `/api/notes/[id]` route contains robust auto-patching logic for Neon/Prisma schema drift (specifically handling cases where `markdownContent` might be silently dropped during fallback if the Prisma client on Vercel is stale relative to the database schema). The database strategy is thoroughly documented in `MIGRATION.md`.

## Testing

- **Unit tests** (`tests/unit/`): Vitest + jsdom + `@testing-library/react`. Config in `vitest.config.ts`.
- **E2E tests** (`tests/e2e/`): Playwright, Chromium only. Config in `playwright.config.ts`. Auto-starts dev server.
- **CI** (`.github/workflows/ci.yml`): Node 20, runs lint → unit tests → build → Playwright E2E.

## Deployment

Push to `main` → auto-deploys to Vercel. Set `DATABASE_URL`, `APP_PASSWORD`, `JWT_SECRET` in Vercel dashboard.