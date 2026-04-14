# Nexus System Design

## Overview

Nexus is a self-hosted, single-user knowledge base and note-taking app built with Next.js App Router, TypeScript, Tailwind CSS, Prisma, and Neon PostgreSQL.

The app is designed for privacy, simplicity, and offline-friendly usage through Progressive Web App features. It supports both Markdown and rich text editing, folder organization, tagging, export/download, and secure access using a single password.

---

## Goals

- Keep the app small and maintainable while supporting a rich note workflow
- Use a single password login model without a full multi-user account system
- Persist notes cleanly with Prisma and PostgreSQL
- Support both markdown-first notes and rich TipTap content
- Provide a modern, responsive mobile-first interface
- Make export and backup easy with download helpers and ZIP generation
- Keep edge cases safe: auth, route protection, schema drift, and data validation

---

## System Components

### 1. Frontend

Located under `src/app` and `src/components`.

#### App Router pages

- `/login` — auth screen for entering the single app password
- `/notes` — main application UI for browsing, editing, and managing notes

#### Client-side architecture

- `src/app/(app)/notes/page.tsx` is the primary client-side page.
- It manages:
  - note list loading and search
  - active note selection
  - note content editing and markdown rendering
  - notebooks/folders
  - tags and filters
  - auto-save behavior and manual save
  - toasts, context menus, and bottom-sheet actions
- The page supports both markdown notes and rich text notes.

#### Editor strategy

- Rich text notes use TipTap with `@tiptap/react` and `@tiptap/starter-kit`.
- Markdown notes use a plain text editing experience with `react-markdown` for preview.
- `src/components/editor/Editor.tsx` is dynamically imported with `ssr: false` so the editor only loads in the browser.

#### Theming

- The UI uses `ThemeProvider` and CSS variables in `globals.css`.
- Multiple themes are supported: light, dark, offwhite, dim, and system.

---

### 2. Authentication and Route Protection

#### Single-password auth

- The app uses a single password stored as `APP_PASSWORD_HASH` in environment variables.
- Login is handled by `/api/auth`.
- Password verification uses `bcryptjs.compare()`.

#### JWT tokens

- Successful login returns a JWT signed with `JWT_SECRET` using `jose`.
- The token expires in 15 minutes.
- The token is also stored in an httpOnly cookie named `nexus_token` for page-level protection.

#### Middleware protection

- `src/proxy.ts` is middleware that intercepts requests.
- It allows:
  - `/login`
  - `/api/auth/*`
  - static assets and Next.js internals
- All other routes require a valid `nexus_token` JWT.
- Unauthenticated users are redirected to `/login`.

#### API auth flow

- API routes can also operate with `Authorization: Bearer <token>` when needed.
- A separate `/api/auth/logout` route clears the cookie.

#### Rate limiting

- Login attempts are protected by an in-memory rate limiter inside `src/lib/rateLimiter.ts`.
- This helps reduce brute-force attempts against the password endpoint.

---

### 3. Backend and Data Layer

#### Prisma and PostgreSQL

- `prisma/schema.prisma` defines the data model.
- Database provider: PostgreSQL.
- The app is intended for Neon PostgreSQL, with `DATABASE_URL` and `DIRECT_URL` environment variables.

#### Data model

- `Note`
  - `id`, `title`, `fileType`, `content`, `markdownContent`, `pinned`, timestamps
  - `content` stores TipTap JSON for rich notes
  - `markdownContent` stores raw markdown for `.md` notes
  - optional `notebookId` references a notebook
  - tags are stored through a join table
- `Notebook`
  - folder container for notes
- `Tag`
  - unique tag name
- `NoteTag`
  - many-to-many relationship between notes and tags

#### Prisma client

- `src/lib/db.ts` exposes a singleton Prisma client.
- In development, it logs queries and errors.
- The singleton pattern avoids multiple clients during hot reload.

---

### 4. API Design

#### Standard API envelope

- All API responses follow the shape:
  - `{ success: true, data: ... }`
  - `{ success: false, error: ... }`

#### Notes API

- `GET /api/notes`
  - Returns all notes.
  - Supports query parameters: `q`, `notebookId`, `tag`.
- `POST /api/notes`
  - Creates a new note.
  - Validates input with Zod.
  - Handles both markdown and rich-text note creation.
- `GET /api/notes/[id]`
  - Fetches a single note by ID.
- `PATCH /api/notes/[id]`
  - Updates note content, title, metadata, tags, and notebook associations.
  - Contains fallback handling for schema drift when older Prisma clients are used.
- `DELETE /api/notes/[id]`
  - Deletes a note.
- `GET /api/notes/[id]/download`
  - Produces a raw file download for a single note.

#### Notebook and Export APIs

- `GET /api/notebooks`
  - Lists notebooks and note counts.
- `POST /api/notebooks`
  - Creates a notebook.
- `PATCH /api/notebooks/[id]`
  - Renames or updates a notebook.
- `DELETE /api/notebooks/[id]`
  - Deletes a notebook and keeps note cleanup via cascade behavior.
- `GET /api/notebooks/[id]/download`
  - Bundles notebook notes into a ZIP archive.

#### Input validation

- `src/lib/validations.ts` centralizes Zod schemas for:
  - login requests
  - note creation and update
  - notebook creation and updates
  - ID validation

---

### 5. Note Content Model

#### Dual content pathways

- Markdown notes are file-type-driven: `.md` notes keep raw markdown in `markdownContent`.
- Rich notes store TipTap editor JSON in `content`.
- `src/lib/fileType.ts` helps determine the final type from title and extension.

#### File type normalization

- The app normalizes file types such as `.md`, `.txt`, `.js`, and more.
- Titles are normalized so they always include a valid extension.
- Notes with `.md` extensions are treated as markdown notes; other extensions use the rich editor.

#### Markdown extraction

- The UI includes helper logic to safely extract plain text from TipTap JSON when markdown fallback is needed.
- This helps keep markdown preview and downloads synced even when the underlying content format is rich text.

---

### 6. Export and Backup Engineering

#### Raw note download

- Single notes can be downloaded in their raw text form.
- Markdown notes stream their markdown content.
- Rich notes generate text from TipTap JSON.

#### Notebook ZIP downloads

- `src/lib/zip.ts` contains a small, dependency-free ZIP builder.
- It assembles ZIP local headers, central directory records, and calculates CRC32 checksums.
- This avoids needing a heavier zip dependency and keeps the server bundle small.

#### Backup helpers

- `src/lib/backup.ts` handles:
  - filename generation
  - plain-text extraction from rich notes
  - download metadata formatting

---

### 7. UI / UX Engineering

#### Responsive design

- The app is mobile-first and optimized for small screens.
- It includes sidebars, bottom sheets, and context menus for touch-friendly navigation.

#### Auto-save and state management

- Notes are auto-saved with debounce logic.
- `pendingPayloadRef` batches pending note updates before sending them to the API.
- The UI tracks `hasUnsavedChanges` and prevents accidental data loss.

#### UX features

- Notes are sorted by pinned state and updated timestamp.
- Search supports filtering by title and tag.
- Notebooks provide folder-style organization.
- Theme switching and installable PWA support improve user experience.

---

### 8. Deployment and Operations

#### Environment variables

- `DATABASE_URL` — runtime PostgreSQL connection
- `DIRECT_URL` — Prisma direct connection for migrations
- `APP_PASSWORD_HASH` — bcrypt hash of the login password
- `JWT_SECRET` — secret used for signing authentication tokens

#### Local development commands

- `npm run dev` — starts Next.js development server at localhost:3000
- `npm run db:migrate` — applies Prisma migrations using .env.local
- `npm run db:generate` — regenerates Prisma client from schema
- `npm run db:studio` — opens Prisma Studio visual database browser

#### Production

- The app is designed to deploy on Vercel.

---

## Diagrams and Visual Reference

This section illustrates the key system flows and relationships through mermaid diagrams.

### Architecture Overview

```mermaid
flowchart TD
  Browser[Browser / Client]
  Browser -->|HTTP / JS| NextApp[Next.js App Router]
  NextApp -->|Middleware| Proxy[Route Protection / JWT]
  NextApp -->|API Calls| AuthApi[/api/auth]
  NextApp -->|API Calls| NotesApi[/api/notes*]
  NextApp -->|API Calls| NotebooksApi[/api/notebooks*]
  NotesApi -->|Prisma| Database[(PostgreSQL)]
  NotebooksApi -->|Prisma| Database
  AuthApi -->|bcrypt + JWT| AuthLib[Auth + Token Logic]
  AuthApi -->|rate limit| RateLimiter[Rate Limiter]

  classDef backend fill:#f8f9fa,stroke:#bbb;
  class AuthApi,NotesApi,NotebooksApi,Proxy,AuthLib,RateLimiter backend;
  classDef db fill:#e8f5e9,stroke:#1b5e20;
  class Database db;
```

### Data Model

```mermaid
erDiagram
  NOTE ||--o{ NOTE_TAG: has
  NOTE ||--o{ TAG: uses
  NOTE }|..|{ NOTEBOOK: belongs_to
  NOTEBOOK ||--o{ NOTE: contains
  TAG ||--o{ NOTE_TAG: connects

  NOTE {
    String id
    String title
    String fileType
    Json content
    String? markdownContent
    Boolean pinned
    DateTime createdAt
    DateTime updatedAt
    String? notebookId
  }
  NOTEBOOK {
    String id
    String name
    DateTime createdAt
    DateTime updatedAt
  }
  TAG {
    String id
    String name
  }
  NOTE_TAG {
    String noteId
    String tagId
  }
```

### Authentication Flow

```mermaid
flowchart LR
  User[User Browser] -->|POST /api/auth| LoginApi[/api/auth]
  LoginApi -->|validate password| Bcrypt[bcryptjs]
  LoginApi -->|generate token| JWT[jose JWT]
  LoginApi -->|set cookie| Cookie[nexus_token httpOnly]
  User -->|requests page/API| Middleware[proxy.ts middleware]
  Middleware -->|verify token| JWT
  Middleware -->|allow or redirect| RouteControl[/login or /notes]
```

### Note Editing Flow

```mermaid
flowchart TB
  User -->|select/create note| NotesPage[Notes page]
  NotesPage -->|fetch| NotesApi[/api/notes]
  NotesPage -->|render| Editor[Markdown or TipTap editor]
  Editor -->|edit note| LocalState[client state]
  LocalState -->|debounced save| PatchApi[/api/notes/:id]
  PatchApi -->|persist| Database
  NotesPage -->|download| DownloadApi[/api/notes/:id/download]
  DownloadApi -->|generate zip/text| BackupLib[backup + zip helpers]
```

---

## Deployment Environments and Configuration

### Environment Setup

- **Development**: Local database and dev server via `npm run dev`
- **Production**: Vercel with Neon PostgreSQL
  - `DATABASE_URL` — pooled connection for runtime queries
  - `DIRECT_URL` — direct connection for migrations
  - `APP_PASSWORD_HASH` — bcrypt password hash (unescaped on Vercel)
  - `JWT_SECRET` — random 64-byte hex string for token signing

### Production Deployment Notes

- Vercel environment variables must include the password hash and JWT secret.
- The app can use Neon PostgreSQL for hosted database persistence.
- Every push to `main` triggers automatic Vercel deployment.

---

### 9. Testing and Quality

#### Test strategy

- Unit tests are organized under `tests/unit`
- End-to-end tests are in `tests/e2e`
- CI runs lint, unit tests, build, and E2E tests on each push

#### Code quality

- The project uses TypeScript for type safety.
- Zod is used for runtime validation in API routes.
- Query logging is enabled in development for Prisma.

---

## Engineering Notes and Learnings

- The single-password auth model keeps the app simple, but it also means the environment secrets are the security boundary.
- Using JWTs for both page and API protection provides a clean separation between browser routing and API access.
- The app deliberately supports schema drift by catching legacy Prisma client errors when `fileType` or `markdownContent` are missing.
- A dependency-free ZIP builder reduces external bundle size and improves portability.
- The design balances markdown-first workflows with rich text editing by treating file extension as the driver of editor mode.

---

## File Map for System Design

- `src/proxy.ts` — request middleware and route protection
- `src/lib/auth.ts` — JWT generation and verification
- `src/lib/db.ts` — Prisma client singleton
- `src/lib/fileType.ts` — file type normalization and note type resolution
- `src/lib/validations.ts` — Zod schema definitions
- `src/lib/backup.ts` — download/backup helper functions
- `src/lib/zip.ts` — ZIP creation logic
- `src/app/api/auth/route.ts` — login endpoint
- `src/app/api/notes/route.ts` — note list and creation endpoint
- `src/app/(app)/notes/page.tsx` — main notes application page

---

## Summary

Nexus is a lightweight, secure, and developer-friendly note app. Its system design focuses on simplicity with strong separation between auth, data storage, API consistency, and UI state. The app uses modern Next.js conventions and Prisma-backed persistence while enabling both markdown and rich-text workflows for personal knowledge management.
