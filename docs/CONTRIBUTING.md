# Contributing to Lumina Write

**Single copy** of the contributing guide (all project Markdown except the [root README](../README.md) lives under **`docs/`**). Links below are **relative to `docs/`**.

This file is **only** about how we collaborate on code (PRs, checks, secrets). It is **not** the setup guide—use [Getting started](getting-started.md) for that.

## Before you code

1. **Environment and running the app** — follow [Getting started](getting-started.md) (clone, `npm install`, `.env`, database, `dev:server` / `dev:web`).
2. **Architecture and APIs** — use the handbook in the [root README](../README.md#documentation-handbook) (*steps 1–8, including REST API reference and sync server docs*).
3. **Something broken?** — see [Troubleshooting](troubleshooting.md).

## Project layout (reminder)

| Path | Role |
| --- | --- |
| `apps/web` | Next.js app, UI, REST route handlers |
| `apps/sync-server` | Socket.IO + Yjs realtime |
| `supabase/` | SQL schema and patches |

## Before you open a PR

1. **Lint the web app:** from repo root, `npm run lint --workspace=apps/web` (or `cd apps/web && npm run lint`).
2. **Describe the change:** what problem it solves and how you tested it (routes touched, socket events, SQL migrations, etc.).
3. **Do not commit** `.env`, `.env.local`, or service-role keys.
4. If you change **RLS or SQL**, say whether `schema.sql` and/or a file under `supabase/patches/` was updated.

## Questions

Deep dives live in **docs/** with **Previous / Next** links on each page—start from the [handbook in the root README](../README.md#documentation-handbook).

---

| [← Previous: Security & operations](security-and-operations.md) | [Handbook (root README)](../README.md#documentation-handbook) | [Begin again: Getting started →](getting-started.md) |
