# Security, tradeoffs & operations

## Security

- **Strict access control** is enforced through **API-level validation** (authenticated Next.js route handlers) and **Supabase Row Level Security (RLS)** on tables where clients use the anon key.
- **Service role keys** stay server-only (`apps/web` API routes and `apps/sync-server`). Never ship them in client bundles.
- The **sync server** accepts only valid Supabase JWTs, then validates **document membership and roles** against Postgres before live edits or presence updates.

## Tradeoffs and design decisions

The architecture is intentionally optimized for **rapid iteration**, **real-time performance**, and **clear paths to production-grade scaling**—especially within typical cloud free-tier constraints.

### Real-time performance vs persistence frequency

Document updates are **batched and persisted on short intervals** rather than on every keystroke.

- **Benefit:** Responsive collaboration and efficient database use.
- **Tradeoff:** Persistence is **near real-time** rather than synchronous per keystroke.
- **Future scope:** Tunable intervals, streaming, or stronger durability guarantees if product requirements demand it.

### In-memory collaboration layer

Live document state is held in the sync service’s **working memory** for **high-speed** merging and broadcast; state is **reconciled with Postgres** on an optimized schedule.

- **Benefit:** Very fast real-time sync for concurrent editors.
- **Tradeoff:** Multi-instance deployments need a **coordinated sync layer** (e.g. shared storage or affinity)—a standard next step when scaling out.
- **Future scope:** Distributed state (e.g. Redis-backed rooms, shared CRDT backends).

### Layered authorization

Access is enforced through **API validation** plus **Supabase RLS**, so permissions stay expressive and auditable across HTTP and database access patterns.

- **Benefit:** Flexible roles (owner, admin, editor, commenter, viewer) with defense in depth.
- **Tradeoff:** Application and database policies must stay aligned as features evolve.
- **Future scope:** Stricter declarative policies or centralized policy services if the product grows.

### Optimized access validation

High-frequency paths **cache access checks briefly** to reduce database load during active editing.

- **Benefit:** Lower latency and fewer round-trips under load.
- **Tradeoff:** Permission changes propagate with **near real-time** consistency.
- **Future scope:** Event-driven invalidation for stricter immediacy where required.

### Cost-efficient deployment

The stack targets **efficient** hosting on modern platforms (e.g. Vercel, Render, Supabase).

- **Benefit:** Low cost to build, demo, and iterate.
- **Tradeoff:** Shared-tier hosting can show variable latency under load unless tuned for production.
- **Future scope:** Dedicated instances, autoscaling, and observability for production SLAs.

## Where it runs

| Piece | Host |
| --- | --- |
| Frontend (Next.js app) | **Vercel** |
| Backend (realtime sync server) | **Render** |
| Database (SQL, auth, RLS) | **Supabase** |

Frontend and sync services are deployed for **cost-efficient scaling** (e.g. Vercel + Render). A **health-check schedule** (external cron hitting `/health`) helps keep services responsive under typical load. Production hardening can add dedicated instances, autoscaling, and monitoring as traffic grows.

## AI tools and how they were used

This project leaned on several AI assistants during planning, design, and implementation. The notes below are for transparency with collaborators and future maintainers.

### ChatGPT and Claude (planning and architecture)

Used for **early project planning** and **architecture design**, including **efficient** use of Supabase, Vercel, and Render so requests and responses flow smoothly end to end.

That work included brainstorming **what features** could make the platform stronger and more distinctive, the **tradeoffs** of adding each idea, high-level **architecture**, **schemas**, and **data flow** (client → app/server → backend services → database): what should be **stored**, how it should be **retrieved**, and how pieces connect end to end.

### Stitch (UI design) and Cursor MCP

**Stitch** was used to generate **frontend layouts and design directions**. The UI **typography and color direction** take inspiration from **Anthropic’s** design language: a **single, balanced palette** that reads well in **daytime and nighttime** use without forcing a separate “dark mode vs light mode” build—one subtle theme that stays easy on the eyes.

The **Stitch MCP** was connected **inside Cursor** so design ideas could feed directly into building the frontend in the editor.

### Codex (VS Code / CLI agent) and integration

The **OpenAI Codex** CLI agent (in VS Code) was used to help **implement the backend end to end** and **wire the frontend to the backend** (APIs, sync server, and app integration).

---

| [← Previous: Data model & roles](data-model.md) | [Handbook (root README)](../README.md#documentation-handbook) | [Next: Contributing →](CONTRIBUTING.md) |
