# Sync server API reference

The sync service (`apps/sync-server`) provides **realtime collaborative document state** (Yjs) and **presence** (awareness) over **Socket.IO**. It does **not** replace the Next.js REST API for comments, sharing, versions, or document metadata.

## Base URL and health

- **Default port:** `4000` (override with `PORT` in `apps/sync-server/.env`).  
- **Health check:** `GET /health` → plain text body `OK` (HTTP 200). Use this for load balancers and uptime checks.

## CORS and browser origins

- Allowed origins are built from a fixed allowlist (including production and `localhost` dev ports) plus **`CLIENT_URL`** from env.  
- **`CLIENT_URL`** may be a single origin or comma-separated list. Set it to your deployed Next.js URL(s).  
- If `CLIENT_URL` is `*`, CORS reflects more permissive behavior—avoid in production unless you understand the tradeoff.

## Socket.IO connection

### Authentication

The server expects a Supabase **JWT** (the user’s `access_token`) at connection time:

| Location | Field |
| --- | --- |
| Preferred | `handshake.auth.token` |
| Alternative | `handshake.query.token` |

The server uses the Supabase **service role** client to call `auth.getUser(token)`. If verification fails, the connection handshake fails with a generic **Authentication failed** error (see server logs for details).

### Successful connection

After `connect`, the client should emit **`doc:join`** with the document UUID so the server can load membership, join the Socket.IO room, and send initial state.

---

## HTTP summary

| Method | Path | Response |
| --- | --- | --- |
| `GET` | `/health` | `200` + `OK` |

---

## Socket events

Payload shapes below match the current TypeScript implementation in `apps/sync-server/src/index.ts`.

### Client → server

| Event | Arguments | Behavior |
| --- | --- | --- |
| `doc:join` | `documentId: string` | Verifies document access; joins room `documentId`; sends `doc:load`, `awareness:sync`, and notifies peers with `presence:joined`. On failure, sends `doc:rejected`. |
| `doc:update` | `documentId: string`, `updateBase64: string` | Requires prior `doc:join` to the same `documentId`. User must have a **write** role (`owner`, `admin`, `editor`). Decodes base64 as a Yjs update, applies to the room document, schedules persistence, broadcasts `doc:broadcast` to other sockets. |
| `awareness:update` | `documentId: string`, `updateBase64: string` | Requires prior `doc:join`. Any member with read access may send presence; server relays `awareness:diff` to other clients in the room. |

### Server → client

| Event | Payload | Meaning |
| --- | --- | --- |
| `doc:load` | `string` (base64) | Full Yjs document state as `Y.encodeStateAsUpdate(doc)`. Client applies with `Y.applyUpdate` using a remote origin. |
| `doc:broadcast` | `string` (base64) | Yjs update from another editor; same decoding as `doc:load` but incremental. |
| `doc:rejected` | `{ reason: string }` | Access denied, write/presence forbidden, invalid update, or internal error. See [Rejection reasons](#rejection-reasons). |
| `awareness:sync` | `Record<string, unknown>` | Initial awareness map for the room when joining. |
| `awareness:diff` | `string` (base64) | Encoded awareness update from y-protocols; apply with `applyAwarenessUpdate`. |
| `presence:joined` | `{ socketId: string, userId?: string }` | Another client joined the document room. |

---

## Rejection reasons

The `doc:rejected` payload includes a machine-oriented `reason` string. The web client maps these to human-readable tooltips.

| `reason` | Typical cause |
| --- | --- |
| `access_denied` | User is not the document owner and has no `document_members` row, or the document id does not exist. |
| `server_error` | Unexpected failure while loading or creating the Yjs document (e.g. persistence layer). |
| `write_forbidden` | User attempted `doc:update` without a write role (e.g. viewer or commenter). |
| `presence_forbidden` | Awareness update rejected after an access check failure (e.g. cache expired and membership changed). |
| `invalid_update` | `doc:update` payload could not be decoded or applied as Yjs (malformed base64 or corrupt update). |
| `invalid_document` | `doc:join` was called with a missing or empty document id. |

---

## Authorization model (realtime)

- **Read path (join + load + awareness):** same as “can access document” in the app: owner or member with any role.  
- **Write path (`doc:update`):** `owner`, `admin`, or `editor` only.  
- Access checks are **cached per socket** for a short TTL to reduce database load during active editing.

---

## Related documentation

- [Handbook (root README)](../README.md#documentation-handbook) — agenda, reading order, and jump links.  
- [API overview](api-overview.md) — REST + socket cheat sheet.  
- [REST API reference](rest-api-reference.md) — request/response contracts for `/api/*`.  
- [Troubleshooting](troubleshooting.md) — connection issues and `doc:rejected` hints.  
- [Contributing](CONTRIBUTING.md) — PR checklist.

---

| [← Previous: REST API reference](rest-api-reference.md) | [Handbook (root README)](../README.md#documentation-handbook) | [Next: Data model & roles →](data-model.md) |
