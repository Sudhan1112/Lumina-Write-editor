# Getting started

**Requirements:** Node.js 18+, npm, and a Supabase project.

## Install and env

```bash
git clone https://github.com/Sudhan1112/Lumina-Write-editor.git
cd Lumina-Write-editor
npm install
cp .env.example apps/web/.env.local
cp .env.example apps/sync-server/.env
```

Edit **`apps/web/.env.local`** and **`apps/sync-server/.env`** using the comments in [`.env.example`](../.env.example). Never commit real keys.

## Database

On a **new** Supabase project, run [`supabase/schema.sql`](../supabase/schema.sql) in the SQL Editor.

On an **existing** database, apply patches under [`supabase/patches/`](../supabase/patches/) in a sensible order (see notes in [Data model & roles](data-model.md)).

## Run locally

Two terminals, or one command:

```bash
npm run dev:server   # sync server → default http://localhost:4000
npm run dev:web      # Next.js → default http://localhost:3000
```

```bash
npm run dev:all
```

### Root scripts (reference)

| Script | Purpose |
| --- | --- |
| `npm run dev:web` | Next.js dev server |
| `npm run dev:server` / `dev:sync-server` | Sync server |
| `npm run dev:all` | `dev` in all workspaces that define it |
| `npm run build:web` | Production build for the web app |
| `npm run build:server` | Compile sync-server to `dist/` |

If the app runs but **live sync fails**, see [Troubleshooting](troubleshooting.md).

---

| [← Handbook (root README)](../README.md#documentation-handbook) | [Next: Architecture & codebase tour →](architecture.md) |
