# Nexus TODOs & Backlog

## Backend / Database
- [ ] **Resolve Production "Schema Drift" Hack:** In `src/app/api/notes/[id]/route.ts`, there is a brittle `try/catch` block that runs raw `ALTER TABLE` SQL commands if Prisma throws an error about missing columns (`fileType` or `markdownContent`). This was added because the Vercel deployed Prisma Client drifted from the active Neon Database. 
  - *Fix:* Ensure the Neon DB is fully migrated via `npx prisma migrate deploy` locally pointing to the production URL, trigger a clean Vercel deployment so the latest Client fetches the updated types, and remove the `catch` hack entirely from the API route.

## Testing
- [ ] **Re-link Test Infrastructure:** The `CLAUDE.md` and testing guides mention running unit and E2E tests via `npm test`, but there are no actual test scripts wired up inside the `package.json`. These need to be properly added back into the NPM scripts to run Vitest / Playwright commands.

## Security
- [ ] **Secure Admin Password:** Instead of storing the admin password in plaintext in `.env`, store a bcrypt-hashed version. Use a library like `bcrypt` to compare incoming passwords against the hash during login.
- [ ] **Implement Rate Limiting:** Protect the login route (`/api/login`) against brute-force attacks by implementing rate-limiting (e.g., using Upstash Redis or a standard Next.js rate limiting utility).
