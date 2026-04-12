# Troubleshooting

Common failures when running locally or in production, and where the app surfaces errors.

## Live sync (Socket.IO)

### Cannot connect / “Could not reach the live sync server”

- **Symptom:** Editor status shows a connection issue; console may log `[sync] connect_error`.
- **Checks:** Sync process is running (`npm run dev:server` from repo root). `NEXT_PUBLIC_SYNC_SERVER_URL` in `apps/web/.env.local` matches the sync URL (e.g. `http://localhost:4000`). In production, use `https://` and allow the app origin in sync-server `CLIENT_URL` / CORS.
- **Code:** `apps/web/src/hooks/useCollabEditor.ts` (`connect_error` handler).

### `doc:rejected` after join or while editing

The server sends `{ reason: string }`. The client maps each code to a tooltip (same codes as [Sync server reference](sync-server-api.md#rejection-reasons)).

| `reason` | What to do |
| --- | --- |
| `access_denied` | Confirm the user is owner or in `document_members` for that doc; verify document id exists. |
| `write_forbidden` | Role is viewer or commenter; only owner/admin/editor may send `doc:update`. |
| `presence_forbidden` | Membership may have changed; refresh. |
| `invalid_update` / `invalid_document` | Bad payload or id; refresh and retry. If it persists, inspect server logs for Yjs/base64 errors. |
| `server_error` | Sync server or DB persistence issue; check `apps/sync-server` logs and Supabase connectivity. |

**Code:** `apps/sync-server/src/index.ts` (emit reasons), `useCollabEditor.ts` (`messageForSyncRejectReason`).

### Editor badge: “Connection issue”

**Code:** `apps/web/src/components/Editor.tsx` — shown when `statusError` (e.g. access load failed) **or** `syncRejectMessage` (sync path) is set.

## REST API (Next.js route handlers)

### `401 Unauthorized`

Routes use the Supabase session from cookies (`createClient()` in server handlers). If the user is not signed in, APIs return `{ error: 'Unauthorized' }` (or similar).

### `403` / `{ error: '...' }` with 4xx

Sharing and access routes enforce owner/admin/editor rules in code; read the handler under `apps/web/src/app/api/documents/[id]/...` for the exact message.

### Parsing JSON errors in the UI

**Code:** `apps/web/src/lib/http.ts` — helpers used by components to read `{ error?: string }` from responses.

---

| [Handbook (root README)](../README.md#documentation-handbook) | [Sync server reference](sync-server-api.md) | [API overview](api-overview.md) |
