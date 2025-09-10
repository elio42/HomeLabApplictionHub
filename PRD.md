# Product Requirements Document (PRD) — Home Server “Application Hub”

**Audience:** you (developer) + GitHub Copilot to generate scaffold/code
**Target tech:** Node.js (TypeScript) backend, React + TypeScript frontend, Material UI, SQLite (Prisma), npm workspaces, Docker + docker-compose
**MVP scope decisions from you (applied):** backend included for persistent state; no authentication (LAN/VPN only); no schedules or lamp control in MVP; no import/export of config in MVP; use `npm` workspaces (not Yarn); no SSE/WebSockets for MVP (polling / manual refresh or optimistic UI used for multi-user small scale).

---

# 1 — Summary / Goal

A lightweight, responsive web app that runs on your NAS and presents a single place (tile grid) to open/manage services running on your LAN. Tiles are editable via UI; server persists state so changes are shared across devices. The app is installable as a PWA. Containerised for easy deployment on your NAS.

MVP primary user story: “As a home-server admin I want a hub UI that lists my services as tiles so I can conveniently open them and maintain the list from any device on my LAN.”

---

# 2 — Constraints & non-goals (MVP)

- LAN-only accessibility; no authentication.
- No proxying, no credential storage.
- No iframe embedding in MVP; links open in same tab or new tab depending on setting.
- No scheduling or smart-home control in MVP (these are planned later).
- No import/export or backup feature in MVP. (Server persistence is the canonical state.)
- One monorepo using `npm` workspaces, shared TypeScript types between client and server.

---

# 3 — Success metrics (MVP)

- Ability to CRUD tiles from any device on LAN and immediately persist changes to server.
- App works well on desktop and mobile (responsive grid).
- Basic UX: add, edit, delete, reorder (drag & drop), search, categorize.
- Containerized and runnable with `docker-compose` on a NAS.
- Developer can reproduce scaffold and run full-stack locally with `npm` commands.

---

# 4 — High-level architecture

Monorepo (npm workspaces):

```
/repo-root
  package.json (workspaces)
  /packages
    /shared            # types, validation used by both client & server
    /server            # Node + TypeScript, Express or Fastify, Prisma+SQLite
    /client            # React + TypeScript + Vite + Material UI (PWA)
  docker-compose.yml
  .env.example
  README.md
```

- Backend: REST API `/api/v1/*` for tiles + optional schedules later.
- Persistence: SQLite via Prisma (single-file DB).
- Frontend: React + TypeScript + Vite, Material UI, React Query for server data + `@dnd-kit` for reorder.
- Dev / Deploy: Dockerfiles for client & server + docker-compose for NAS.

---

# 5 — MVP Features (functional)

1. Tile CRUD: create, read, update, delete tiles.
2. Tile reorder (drag & drop).
3. Tile categories / tabs: default “Services” tab; design supports adding tabs later.
4. Search/filter tiles by text and category.
5. Tile visibility toggles (hide/unhide).
6. Open tile: open in new tab or open in current tab (user chooses per-tile).
7. Persisted server state: all CRUD operations persist to server DB.
8. Local offline fallback: frontend caches last successful fetch in `localStorage` to show something if server temporarily unavailable (no client authoring while offline).
9. PWA manifest + basic service worker for offline shell (not full offline editing).
10. Containerised deployment (docker-compose) with instructions for NAS.

---

# 6 — Non-MVP / Later features (to design for but do not implement in MVP)

- lamp controller (smart home type stuff), device scheduling, remote control APIs.
- Proxying/services embedding (iframe) and secrets storage.
- Multi-user preferences & sync.

---

# 7 — User stories & acceptance criteria (MVP)

Each user story followed by acceptance criteria (AC).

1. **List tiles**

- Story: As a user I want to see all configured tiles when I open the hub.
- AC:

  - GET `/api/v1/tiles` returns list sorted by `order`.
  - Frontend renders tiles in grid on `/` within 2s on LAN.
  - If server unreachable, frontend displays cached list from `localStorage` with a warning banner.

2. **Add tile**

- Story: As a user I can add a new tile with title, URL, category, optional icon and target.
- AC:

  - POST `/api/v1/tiles` validates input and returns created Tile with `id` and `createdAt`.
  - New tile appears in grid immediately after success.
  - New tile persisted to DB (verify by restart).

3. **Edit tile**

- Story: As a user I can edit tile fields (title, url, category, icon, target, visible).
- AC:

  - PUT `/api/v1/tiles/:id` returns updated tile.
  - Frontend updates tile in UI without reloading the page.

4. **Delete tile**

- Story: As a user I can delete a tile.
- AC:

  - DELETE `/api/v1/tiles/:id` returns 204.
  - Tile disappears from UI after success.

5. **Reorder tiles**

- Story: As a user I can change tile order by drag & drop.
- AC:

  - Frontend sends ordered list to `PUT /api/v1/tiles/reorder` or individual PATCH with `order`.
  - After reorder, GET returns tiles with new order.

6. **Search & filter**

- Story: As a user I can search for tiles by text and filter by category.
- AC:

  - Search client-side based on cached/queried tiles; results update live.

7. **Open tile**

- Story: Tapping a tile opens the target URL in new tab or current tab depending on tile target.
- AC:

  - Links open correctly; for common protocols (http/https) browsers open as expected.

8. **PWA installable**

- Story: The app can be added to home screen (mobile) / installed to desktop.
- AC:

  - Manifest present and service worker registers; browser prompts for install.

9. **Docker deploy**

- Story: The app can be deployed on NAS using docker-compose.
- AC:

  - `docker-compose up --build` starts client on port 8080 and server on port 4000 (configurable).
  - Data persistent to `./data` volume (SQLite file).

---

# 8 — Data model (shared TypeScript interfaces + Prisma)

## Shared TypeScript (packages/shared/src/types.ts)

```ts
export type UUID = string;

export type TileTarget = "_blank" | "_self";

export interface Tile {
  id: UUID;
  title: string;
  url: string;
  icon?: string; // optional filename or data URL
  category?: string;
  description?: string;
  target?: TileTarget;
  order?: number;
  visible?: boolean;
  createdAt: string; // ISO
  updatedAt?: string;
}
```

## Prisma schema (prisma/schema.prisma) — SQLite

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Tile {
  id          String   @id @default(uuid())
  title       String
  url         String
  icon        String?
  category    String?
  description String?
  target      String?   // "_blank" | "_self"
  order       Int?
  visible     Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime?
}
```

---

# 9 — Backend API spec (MVP) — `/api/v1`

> Base URL: `http://<server>:4000/api/v1` (server port configurable)

### Tiles

- `GET /tiles`

  - Response: `200` `{ tiles: Tile[] }` (ordered by `order` ascending)

- `GET /tiles/:id`

  - Response: `200` `{ tile: Tile }` or `404`

- `POST /tiles`

  - Body: `{ title, url, icon?, category?, description?, target? }`
  - Response: `201` `{ tile: Tile }` (server sets `id`, `createdAt`, default `order` to max+1)

- `PUT /tiles/:id`

  - Body: partial tile fields to update
  - Response: `200` `{ tile: Tile }` or `404`

- `DELETE /tiles/:id`

  - Response: `204` or `404`

- `PUT /tiles/reorder`

  - Body: `{ order: { id: string, order: number }[] }` or `{ ids: string[] }`
  - Response: `200` `{ tiles: Tile[] }` updated with new orders

### Misc

- `GET /health` -> `200` `{ status: "ok" }`

Notes:

- Validation: url must be valid URL or a recognized scheme (`http`, `https`, `smb`, `ssh`, etc.). Only store string; client handles special schemes (e.g., `smb://` opens external app).
- CORS: allow client origin; in containerized LAN may be same host/port with nginx reverse, but simplest is allow `*` on LAN. I think for LAN only allow `*` will be fine.

---

# 10 — Frontend architecture & file tree (client)

```
/packages/client
  package.json
  vite.config.ts
  tsconfig.json
  src/
    main.tsx
    App.tsx
    index.css
    routes/
      Home.tsx
      Settings.tsx
    components/
      TileGrid.tsx
      TileCard.tsx
      TileFormDialog.tsx
      ConfirmDialog.tsx
      SearchBar.tsx
      CategoryTabs.tsx
    api/
      apiClient.ts        // axios instance pointing to /api/v1
      tiles.ts            // hooks/wrappers for tiles endpoints
    hooks/
      useTiles.ts         // React Query hooks
    services/
      offlineCache.ts     // localStorage fallback logic
    assets/
    manifest.json
    serviceWorker.ts
```

Key libraries:

- React + React DOM
- TypeScript
- Vite
- Material UI (MUI v5)
- React Query (TanStack Query)
- axios (or fetch wrapper)
- @dnd-kit/core & @dnd-kit/sortable (drag & drop)
- UUID (for client-side temp ids)
- workbox (for PWA SW) or Vite PWA plugin

Frontend responsibilities:

- Query `GET /api/v1/tiles` and display.
- Mutations: POST/PUT/DELETE tile -> call backend; use optimistic updates + invalidate queries.
- Reorder: use drag-and-drop to compute new order and call `PUT /tiles/reorder`.
- Cache: when GET fails, load `localStorage` cache; store latest successful GET into `localStorage`.

---

# 11 — Backend architecture & file tree (server)

```
/packages/server
  package.json
  tsconfig.json
  src/
    index.ts            // starts server, db, and routes
    app.ts
    routes/
      tiles.ts
      health.ts
    db/
      prismaClient.ts
    controllers/
      tilesController.ts
    services/
      tileService.ts
    utils/
      validation.ts
    prisma/
      migrations/
  prisma/
    schema.prisma
```

Key libraries:

- Node 20
- TypeScript
- Express
- Prisma + @prisma/client
- sqlite3
- node-fetch (if action calls later)
- nodemon & ts-node-dev for dev

Behavior:

- Start server, connect to SQLite. If no DB file, run migrations.
- REST endpoints with validation.

---

# 12 — Dev & deployment (npm scripts, Docker)

## Root `package.json` (workspaces)

```json
{
  "name": "hub-monorepo",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "concurrently \"npm:dev:server\" \"npm:dev:client\"",
    "dev:server": "npm --workspace=@hub/server run dev",
    "dev:client": "npm --workspace=@hub/client run dev",
    "build": "npm --workspace=@hub/server run build && npm --workspace=@hub/client run build",
    "start": "npm --workspace=@hub/server run start"
  },
  "devDependencies": {
    "concurrently": "^7.0.0"
  }
}
```

## Server `package.json` (examples)

Scripts:

- `dev` -> `ts-node-dev src/index.ts`
- `build` -> `tsc`
- `start` -> `node dist/index.js`
  Dependencies: express, prisma, @prisma/client, cors, zod (or Joi) for validation

## Client `package.json`

Scripts:

- `dev` -> `vite`
- `build` -> `vite build`
- `preview` -> `vite preview`
  Dependencies: react, react-dom, mui, react-query, axios, @dnd-kit

## Docker / docker-compose (root)

`docker-compose.yml`:

```yaml
version: "3.8"
services:
  server:
    build: ./packages/server
    ports:
      - "4000:4000"
    volumes:
      - ./data:/app/data
    environment:
      - DATABASE_URL=file:./data/dev.db
  client:
    build: ./packages/client
    ports:
      - "8080:80"
```

Server Dockerfile: build Node app and run `node dist/index.js`. Set `DATABASE_URL=file:./data/dev.db` by env in compose; ensure `./data` exists and is volume mounted for persistence.

Client Dockerfile: build static files and serve with nginx. Serve on port 80; map container 80 -> host 8080.

---

# 13 — Validation & error handling rules

- All server input validated (use Zod). For tile:

  - title: non-empty string, max 128 chars
  - url: must be a valid URL or a scheme matching `^[a-z0-9+.-]+://`
  - category: optional string max 64
  - target: optional `_blank` or `_self`

- Return 400 on validation error with machine-readable message.
- On DB errors return 500 with minimal message and server logs write full error.

---

# 14 — Accessibility

- Use semantic HTML and MUI components.
- Keyboard navigation for add/edit and drag & drop fallback.
- Contrast ratio verification for text.

---

# 15 — Security notes (MVP)

- No auth — ensure server only accessible from LAN/VPN:

  - In Docker compose, bind ports to host but rely on host firewall; optionally run server on internal network only.
  - Suggest running docker compose on an internal interface or set firewall rule to restrict access.

- Do not store sensitive credentials. If user wants to add credentials later, plan to add encrypted secrets storage.
- HTTPS is optional for LAN; use HTTP

---

# 16 — Extensibility / later migration notes

- Shared `packages/shared` types mean moving logic into server/client is straightforward.
- Add real-time: add SSE endpoint or socket.io, update React Query cache on events.
- Add schedules & lamp control: add `schedules` DB model and background worker (node-cron).
- Add auth: JWT or proxy-auth in front of app.

---

# 17 — Implementation backlog (prioritized)

**Sprint 0 — Setup (low effort)**

- Initialize monorepo with npm workspaces.
- Add `packages/shared` with Tile types.
- Configure TypeScript build for server & client.
- Add root README & run instructions.

**Sprint 1 — Server (essential)**

- Implement Prisma schema + migration.
- Implement Express server and tiles endpoints (GET/POST/PUT/DELETE/reorder).
- Add validation and basic tests.
- Add Dockerfile and ensure DB persisted to `./data`.

**Sprint 2 — Client (essential)**

- Scaffold Vite + React + TS + Material UI.
- Implement listing view, add/edit dialogs, deletion flow.
- Integrate React Query calls to server endpoints.
- Implement drag & drop reorder via `@dnd-kit`.
- Add offline cache fallback to `localStorage`.
- Add PWA manifest + simple service worker.

**Sprint 3 — Polish & deploy**

- Create Nginx Dockerfile for client.
- Create docker-compose and test on NAS.
- Add docs.

**Sprint 4 — Optional improvements**

- Add optional SSE/WebSocket for immediate cross-client updates.
- Add backup/export UI.
- Add device/schedule module.

---

# 18 — Example payloads (concrete)

**Create tile**

```
POST /api/v1/tiles
Content-Type: application/json
{
  "title": "Jellyfin",
  "url": "http://192.168.1.10:8096",
  "icon": "jellyfin.svg",
  "category": "Media",
  "target": "_blank"
}
```

**Response**

```
201
{
  "tile": {
    "id":"c7a8a4c2-...",
    "title":"Jellyfin",
    "url":"http://192.168.1.10:8096",
    "icon":"jellyfin.svg",
    "category":"Media",
    "target":"_blank",
    "order": 3,
    "visible": true,
    "createdAt":"2025-09-06T..."
  }
}
```

**Reorder**

```
PUT /api/v1/tiles/reorder
Content-Type: application/json
{
  "ids": ["id3", "id1", "id2"]
}
```

Response `200` with updated tiles.
