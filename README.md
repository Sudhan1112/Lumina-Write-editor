# Lumina Write

A real-time collaborative document editor built for the GUVI Hackathon. Multiple users can write together in the same document simultaneously, with live cursors, presence awareness, version history, and an AI writing assistant powered by Grok.

**Live demo:** [lumina-write.vercel.app](https://lumina-write.vercel.app)

---

## Features

- **Real-time collaboration** — Conflict-free concurrent editing via Yjs CRDTs, synced over Socket.IO WebSockets
- **Live presence** — Colored cursors and avatar bar showing who is editing right now
- **Rich text editor** — TipTap v2 toolbar with headings, bold/italic/underline, links, image blocks, font family, text color, and highlight
- **Document outline** — Auto-generated sidebar outline from heading nodes
- **Version history** — Save and restore named snapshots of the Yjs document state
- **Sharing & access control** — Invite collaborators by email, assign roles (viewer / commenter / editor / admin), revoke access
- **Access request system** — Users without access can request it; owners approve or reject from the share modal
- **AI writing assistant** — Lumina AI panel powered by Grok (`grok-beta`) with chat, quick-ask prompts, and a prompt library; streaming completions inline in the editor
- **Template gallery** — One-click document creation from 10 templates (blank, meeting notes, blog post, resume, PRD, and more)
- **Dashboard** — Grid and list views, sort options, trash/restore, notifications for shared documents
- **Authentication** — Google OAuth and email/password sign-in via Supabase Auth
- **Responsive design** — Mobile bottom nav, collapsible sidebar, floating action button

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS 3 with custom design tokens |
| Rich text | TipTap v2 (ProseMirror), custom extensions |
| Real-time sync | Yjs (CRDT), Socket.IO client |
| Sync server | Node.js, Express, Socket.IO server |
| Database & Auth | Supabase (PostgreSQL, Row Level Security, Auth) |
| AI | xAI Grok API (`grok-beta`) — streaming completions |
| Deployment | Vercel (frontend), Render (sync server) |

---

## Monorepo Structure

```
lumina-write/
├── apps/
│   ├── web/                        # Next.js 14 frontend (Vercel)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── api/            # Route handlers
│   │   │   │   │   ├── documents/  # CRUD, share, access, versions
│   │   │   │   │   ├── users/      # Email search
│   │   │   │   │   └── ai/         # Grok completion + template
│   │   │   │   ├── doc/[id]/       # Editor page
│   │   │   │   ├── login/          # Auth page
│   │   │   │   └── auth/callback/  # OAuth redirect handler
│   │   │   ├── components/
│   │   │   │   ├── Editor.tsx          # Main TipTap editor (toolbar, outline, panels)
│   │   │   │   ├── ShareModal.tsx      # Member invite & role management
│   │   │   │   ├── VersionHistoryPanel.tsx
│   │   │   │   ├── AIAssistantPanel.tsx
│   │   │   │   ├── PresenceBar.tsx     # Live collaborator avatars
│   │   │   │   └── editorExtensions.ts # Custom TipTap extensions
│   │   │   ├── hooks/
│   │   │   │   └── useCollabEditor.ts  # Yjs + Socket.IO wiring
│   │   │   └── lib/
│   │   │       ├── supabase/       # Browser, server, admin clients
│   │   │       ├── cursorColors.ts
│   │   │       ├── http.ts
│   │   │       └── notify.ts
│   │   └── package.json
│   └── sync-server/                # Express + Socket.IO (Render)
│       └── src/
│           ├── index.ts            # Socket.IO server, room management
│           ├── yjsManager.ts       # In-memory Yjs docs, debounced persistence
│           └── auth.ts             # JWT verification middleware
├── supabase/
│   ├── schema.sql                  # Full database schema + RLS policies
│   └── patches/                    # Migration patches
├── .env.example                    # Environment variable template (no secrets)
└── package.json                    # npm workspaces root
```

---

## Local Development

### Prerequisites

- Node.js 18+
- An npm account (for workspaces)
- A [Supabase](https://supabase.com) project
- An [xAI](https://console.x.ai) API key (for AI features)

### 1. Clone and install

```bash
git clone https://github.com/Sudhan1112/Lumina-Write-editor.git
cd Lumina-Write-editor
npm install
```

### 2. Set up environment variables

Copy the template and fill in your values:

```bash
cp .env.example apps/web/.env.local
cp .env.example apps/sync-server/.env
```

**`apps/web/.env.local`**

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NEXT_PUBLIC_SYNC_SERVER_URL=http://localhost:4000
GROK_API_KEY=xai-<your-key>
```

**`apps/sync-server/.env`**

```env
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_JWT_SECRET=<jwt-secret>
PORT=4000
```

### 3. Set up the database

Run `supabase/schema.sql` in the Supabase SQL editor. This creates all tables, RLS policies, and the `SECURITY DEFINER` helper functions needed to prevent RLS recursion.

If you are migrating an existing project, also run the patches in order:

```
supabase/patches/add_admin_role.sql
supabase/patches/fix_document_members_rls.sql
```

### 4. Run the project

```bash
# Terminal 1 — sync server
npm run dev --workspace=apps/sync-server

# Terminal 2 — Next.js frontend
npm run dev --workspace=apps/web
```

The app will be available at `http://localhost:3000`. The sync server runs on `http://localhost:4000`.

---

## Database Schema

| Table | Purpose |
|---|---|
| `profiles` | Auto-created on sign-up; stores name, email, avatar |
| `documents` | Document records with owner and Yjs state |
| `document_members` | Many-to-many: user ↔ document with role |
| `document_versions` | Named Yjs snapshots for version history |
| `document_access_requests` | Pending/approved/rejected access requests |

RLS policies are enforced on every table. The `is_document_member` and `is_document_owner` functions use `SECURITY DEFINER` to avoid infinite recursion when policies check membership while the membership table itself has RLS enabled.

---

## Deployment

### Frontend — Vercel

1. Connect the GitHub repo to Vercel.
2. Set the root directory to `apps/web`.
3. Add all `NEXT_PUBLIC_*`, `SUPABASE_SERVICE_ROLE_KEY`, and `GROK_API_KEY` environment variables in the Vercel project settings.

### Sync Server — Render

1. Create a new Web Service on Render pointing to the repo.
2. Set the root directory to `apps/sync-server`.
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, and `PORT` as environment variables.

After deploying, update `NEXT_PUBLIC_SYNC_SERVER_URL` in Vercel to point to your Render service URL.

---

## Architecture — Real-Time Collaboration

```
Browser A                    Sync Server                    Browser B
─────────                    ───────────                    ─────────
TipTap Editor                Express + Socket.IO            TipTap Editor
    │                               │                           │
    │  socket.emit('yjs-update')    │                           │
    │──────────────────────────────>│                           │
    │                               │  socket.to(room).emit()  │
    │                               │─────────────────────────>│
    │                               │                           │ applyUpdate()
    │                               │   awareness broadcast     │
    │<──────────────────────────────│<─────────────────────────│
    │  (cursor position, name)      │                           │
```

- Each document is a **Yjs Y.Doc** held in memory on the sync server.
- Updates are binary-encoded and broadcast to all peers in the same Socket.IO room.
- The **awareness protocol** carries cursor positions and user metadata separately from document content.
- On reconnect, the server sends the full Yjs state vector so the client can catch up.
- The sync server debounces a **persistence write** back to Supabase every 5 seconds using the service role key.

---

## Hackathon Scoring Coverage

| Criterion | Implementation |
|---|---|
| Code Quality & Structure (25 pts) | Monorepo with npm workspaces, TypeScript throughout, feature-branch git history with conventional commits, sanitized env templates |
| Features & Functionality (30 pts) | All 8 core features implemented: auth, dashboard, CRUD, real-time editing, sharing, versions, AI assistant, presence |
| Technical Implementation (25 pts) | Next.js 14 App Router, Supabase RLS, Yjs CRDT, Socket.IO, TipTap v2, Grok streaming API |
| User Experience & Design (20 pts) | Warm Lumina brand system, Tailwind design tokens, responsive layout, mobile nav, skeleton loading states, toast notifications |
