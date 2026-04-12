# API overview

High-level reference for **HTTP** (Next.js Route Handlers) and **Socket.IO** (sync server).

**Full REST contracts** (bodies, fields, status codes): [REST API reference](rest-api-reference.md).  
**Sync (Socket.IO) detail:** [Sync server reference](sync-server-api.md).

## HTTP API — route map

All routes live under `apps/web/src/app/api/`. They expect an authenticated Supabase session unless noted. Typical error shape: **`{ "error": string }`** with `401` when there is no session.

| Route | Methods | Source file | Purpose |
| --- | --- | --- | --- |
| `/api/documents` | `GET`, `POST` | `documents/route.ts` | List documents for the current user (owned + shared); create a new document. |
| `/api/documents/[id]/access` | `GET`, `POST`, `PATCH` | `documents/[id]/access/route.ts` | List / create / moderate **access requests** (owner/admin for moderation). |
| `/api/documents/[id]/share` | `GET`, `POST`, `PATCH`, `DELETE` | `documents/[id]/share/route.ts` | Members, invites, role changes (owner/admin; cannot target the owner user id). |
| `/api/documents/[id]/versions` | `GET`, `POST` | `documents/[id]/versions/route.ts` | List and create **Yjs snapshot** metadata for version history. |
| `/api/documents/[id]/comments` | `GET`, `POST`, `PATCH`, `DELETE` | `documents/[id]/comments/route.ts` | Threaded comments and resolve/delete by role rules. |
| `/api/users/search` | `GET` | `users/search/route.ts` | Search profiles for **sharing** UI (authenticated). |

### Implementation notes for contributors

- **Auth:** Handlers use `@/lib/supabase/server` (`createClient`) for the user session and `@/lib/supabase/admin` (`createAdminClient`) where service-role queries are required—**never** expose the service key to the browser.
- **Responses:** Prefer consistent JSON errors so the UI can call shared helpers in `apps/web/src/lib/http.ts` (`getResponseErrorMessage`, etc.).
- **RLS:** Tables touched from the browser still rely on Supabase RLS; API routes add **application-level** checks (owner/admin) that must stay aligned with [Data model & roles](data-model.md).

For request/response **field-level** documentation, treat the route files as the source of truth (TypeScript types and `NextResponse.json` payloads).

## Socket events (`apps/sync-server`)

| Event | Direction | Role |
| --- | --- | --- |
| `doc:join` | Client → server | Enter room; receive `doc:load` |
| `doc:load` | Server → client | Full Yjs state (base64) |
| `doc:update` | Client → server | Yjs update (writers only) |
| `doc:broadcast` | Server → others | Remote update |
| `doc:rejected` | Server → client | No access or error ([reason codes](sync-server-api.md#rejection-reasons)) |
| `awareness:update` / `awareness:sync` / `awareness:diff` | Both | Presence |
| `presence:joined` | Server → room | Optional notify |

**Next:** [REST API reference (full contracts) →](rest-api-reference.md) · [Sync server reference →](sync-server-api.md)

**When something breaks:** [Troubleshooting →](troubleshooting.md)

---

| [← Previous: Architecture](architecture.md) | [Handbook (root README)](../README.md#documentation-handbook) | [Next: REST API reference →](rest-api-reference.md) |
