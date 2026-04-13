# Database Migration Guide

This document outlines the steps to migrate your database away from Neon DB (or any PostgreSQL provider) to a new PostgreSQL provider (like Supabase, AWS RDS, Render, etc.). 

Since Nexus relies on **Next.js, Prisma, and PostgreSQL**, there is **zero vendor lock-in**. Migrating is generally a process of dumping the exact data from your current database and importing it into the new one, then updating your connection strings.

---

## 🚀 Prerequisites

1. You must have PostgreSQL installed locally on your machine specifically to access the `pg_dump` and `psql` / `pg_restore` command-line tools.
   - **Windows:** Installed via EnterpriseDB or Postgres.app.
   - **Mac:** `brew install postgresql`
   - **Linux:** `sudo apt install postgresql-client`

---

## 🛠️ Step-by-Step Migration Process

### Step 1: Backup (Dump) Your Current Data

You need to extract all the data and schema from your current provider (Neon).

1. Find your current `DATABASE_URL` string in your `.env.local` or environment variables on Vercel.
2. Run the following command in your terminal to export a backup file. Keep the connection string secret!

```bash
# We recommend keeping backups in a dedicated folder
mkdir -p backups
pg_dump "postgres://[YOUR_CURRENT_USER]:[YOUR_CURRENT_PASSWORD]@[YOUR_NEON_DOMAIN].neon.tech/neondb?sslmode=require" -F c > backups/nexus_backup.dump
```
*(The `-F c` flag tells `pg_dump` to create an optimized custom-format backup file. Our `.gitignore` is configured to ignore the `backups/` folder and `*.dump` files so you don't accidentally commit your sensitive database data to Git).*

### Step 2: Create a New Database

1. Sign up for your new provider (e.g., Supabase, Render, Aiven, or self-host your own Postgres instance).
2. Create a new PostgreSQL database.
3. Retrieve the **Connection String** (`DATABASE_URL`) from your new provider.

### Step 3: Update Your Environment Variables

Update your local codebase to point to the new database.

1. Open `.env.local`
2. Replace your existing URL with the new one:
```env
# Change this:
DATABASE_URL="postgres://old_neon_db_url..."
DIRECT_URL="postgres://old_neon_db_url..."

# To this:
DATABASE_URL="postgres://new_provider_db_url..."
DIRECT_URL="postgres://new_provider_db_url..."
```

### Step 4: Sync Your Schema Structure

Before copying data over, make sure your new database has the exact table structures that Prisma expects.

Run your Prisma migrations against the new database:
```bash
npm run db:migrate
# or
npx prisma migrate deploy
```

### Step 5: Restore Data to the New Database

Finally, put your dumped data into the new provider. Use the `pg_restore` command with the new connection URL:

```bash
pg_restore -d "postgres://[NEW_USER]:[NEW_PASSWORD]@[NEW_PROVIDER_HOST]/[NEW_DB_NAME]?sslmode=require" nexus_backup.dump
```

*(Depending on the provider and configurations, you might need to drop tables first if the migration created them. In that case, add the `--clean` flag to the pg_restore command).*

---

## ✅ Verification

1. Run `npm run db:studio` locally to visually verify that all your Notes, Notebooks, and Tags appear in the new database.
2. Test local functionality: `npm run dev`. Verify you can save and edit a note.
3. Once verified, update your **Production Environment Variables** (e.g., in the Vercel Dashboard) with the new `DATABASE_URL` and redeploy.

## ⚠️ Notes on Specific Providers
* **Supabase**: If you move to Supabase, they use connection pooling for Next.js serverless functions. Ensure your `DATABASE_URL` points to the connection pooler port (often `6543`) and your `DIRECT_URL` (in `.env`) points to the direct session port (`5432`). 
* **Database Pauses**: If switching to another free tier, be aware of cold-starts and inactivity pauses (e.g., Supabase's 7-day auto-pause).
