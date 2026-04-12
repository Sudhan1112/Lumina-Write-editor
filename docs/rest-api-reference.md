# REST API reference (Next.js route handlers)

Contracts for **`apps/web/src/app/api`**. Realtime sync is **not** covered here—see [Sync server reference](sync-server-api.md).

## Conventions

| Topic | Detail |
| --- | --- |
| **Base URL** | Same origin as the Next app, path prefix **`/api`** |
| **Content type** | `application/json` for bodies |
| **Auth** | Supabase session via cookies (`createClient()` from `@/lib/supabase/server`). No session → **`401`** with `{ "error": "Unauthorized" }` unless noted |
| **Errors** | JSON object **`{ "error": string }`** (human-readable). Status **`400`** validation, **`401`** auth, **`403`** forbidden, **`404`** not found, **`500`** server/DB |
| **Invalid JSON** | **`400`** `{ "error": "Invalid JSON body" }` or `{ "error": "JSON body must be an object" }` where handlers use `@/lib/api-route-errors` |
| **Client helpers** | `readResponsePayload`, `getResponseErrorMessage` in `apps/web/src/lib/http.ts` |

---

## `GET/POST /api/documents`

**File:** `apps/web/src/app/api/documents/route.ts`

### `GET`

Lists documents the user **owns** or **is a member of**, newest `updated_at` first.

**Response `200`:** JSON array of objects:

| Field | Type | Notes |
| --- | --- | --- |
| `id`, `title`, `updated_at`, `created_at`, `owner_id` | string | Document row |
| `owner` | object \| null | `profiles` shape: `id`, `email`, `full_name`, `avatar_url` |
| `members` | array | `document_members` rows with embedded `profiles` |

Empty list → **`200`** and body `[]`.

### `POST`

Creates a document; inserts owner row into `document_members` via service role.

**Request body (optional):** `{ "title"?: string }` — omit or `{}` for default **Untitled Document**.

**Response `200`:** Inserted `documents` row (Supabase `.select().single()`).

---

## `GET/POST/PATCH /api/documents/{id}/access`

**File:** `apps/web/src/app/api/documents/[id]/access/route.ts`  
**Path param:** `id` — document UUID.

### `GET`

Access state for the current user plus pending requests for moderators.

**Response `200`:**

| Field | Type |
| --- | --- |
| `document` | `{ id, title }` |
| `owner` | profile row |
| `isOwner` | boolean |
| `hasAccess` | boolean (owner or member) |
| `role` | `"owner"` or member role or `null` |
| `latestRequest` | access request + `profiles` + `current_role` or `null` |
| `pendingRequests` | array (only when `canModerateAccessRequests`) |
| `canModerateAccessRequests` | boolean (owner or admin member) |

### `POST`

Create or update a **pending** access request (non-owners).

**Request body:** `{ "requested_role"?: string }` — must be one of `viewer`, `commenter`, `editor`, `admin` (default `editor` if missing).

**Response `200`:** Access request row, or **`400`** for business rules (e.g. already owner, same role, invalid role).

### `PATCH`

Owner or **admin** approves or rejects a request.

**Request body:** `{ "request_id": string, "status": "approved" | "rejected" }`

**Response `200`:** Updated request row. **`403`** if not owner/admin. **`404`** if document or request missing.

---

## `GET/POST/PATCH/DELETE /api/documents/{id}/share`

**File:** `apps/web/src/app/api/documents/[id]/share/route.ts`

### `GET`

Member list with profiles; ensures a synthetic **owner** row if missing from `document_members`.

**Response `200`:** Array of member objects with `profiles`.

### `POST`

Invite or upsert member (owner or admin).

**Request body:** `{ "user_id": string, "role": string }` — role ∈ `viewer` | `commenter` | `editor` | `admin`.

**Response `200`:** Array of affected member rows with profiles. **`500`** may include a special message if enum `app_role` lacks `admin` (see handler).

### `PATCH`

Same body as POST; may sync matching pending access requests.

**Response `200`:** Single member object.

### `DELETE`

**Query:** `?user_id=` **or** JSON body `{ "user_id": string }`.

**Response `200`:** `{ "success": true }`.

---

## `GET/POST /api/documents/{id}/versions`

**File:** `apps/web/src/app/api/documents/[id]/versions/route.ts`

Requires document access (owner or any member).

### `GET`

**Response `200`:** Up to **100** versions, `created_at` descending. Each includes `yjs_state` (base64), `label`, `profiles`, etc.

### `POST`

**Request body:** `{ "yjs_state": string, "label"?: string }` — `yjs_state` required (base64). Default label **`Auto-save`**; **`Manual snapshot`** skips deduplication by binary state.

**Response `200`:** Version row with profiles, or `{ "id": string, "skipped": true }` if deduped.

---

## `GET/POST/PATCH/DELETE /api/documents/{id}/comments`

**File:** `apps/web/src/app/api/documents/[id]/comments/route.ts`

### `GET`

**Response `200`:**

```json
{
  "role": "owner | admin | editor | commenter | viewer",
  "can_comment": true,
  "can_moderate": true,
  "comments": [ /* normalized comments with author, resolver */ ]
}
```

### `POST`

**Request body:** `{ "content": string, "selection_text"?: string }` — content required, max **2000** chars; selection max **400**.

**Response `200`:** Single comment object. **`403`** if role cannot comment.

### `PATCH`

**Request body:** `{ "comment_id": string, "content"?: string, "status"?: "open" | "resolved" }` — at least one of `content` / `status`.

**Response `200`:** Updated comment.

### `DELETE`

**Query:** `?comment_id=` **or** body `{ "comment_id": string }`.

**Response `200`:** `{ "success": true }`.

---

## `GET /api/users/search`

**File:** `apps/web/src/app/api/users/search/route.ts`

**Query:** `q` — email substring (case-insensitive). Missing or empty `q` → **`200`** `[]`.

**Response `200`:** Up to **5** profile rows (`id`, `email`, `full_name`, `avatar_url`).

---

## Implementation notes

- Handlers use **`createAdminClient()`** where RLS or bulk queries require the service role; keys stay server-only.
- **`parseJsonObject` / `parseJsonObjectOptional`** live in `apps/web/src/lib/api-route-errors.ts` for safe JSON parsing on selected routes.

---

| [← Previous: API overview](api-overview.md) | [Handbook (root README)](../README.md#documentation-handbook) | [Next: Sync server reference →](sync-server-api.md) |
