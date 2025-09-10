# HomeLab Application Hub Architecture

## Overview

A TypeScript monorepo providing a lightweight "application / service launcher" dashboard. It consists of:

- `packages/server`: Express + Prisma API for tile (shortcut) management and icon processing.
- `packages/client`: React SPA (Vite, MUI, React Query, DnD Kit) consuming the API.
- `packages/shared`: Shared TypeScript types (notably the `Tile` interface) consumed by both server and client for compile‑time safety.

Primary domain object: **Tile** — represents a user shortcut with fields: `id, title, url, icon, iconSourceUrl, category, description, target, order, visible, createdAt, updatedAt`.

Icons can originate from:

1. User upload (client converts to data URL → server sanitizes → stored in DB).
2. Remote image URL explicitly fetched (persisted as sanitized data URL + original in `iconSourceUrl`).
3. Favicon fallback (server attempts known favicon paths when no explicit icon provided or when icon cleared).
4. Letter fallback (client displays first letter of title if no `icon`).

## High-Level Flow

1. Client loads tiles via `GET /api/v1/tiles` (React Query caches result; offline cache stored in `localStorage`).
2. User creates / edits tile in `TileFormDialog`:
   - Chooses Upload or URL mode.
   - For URL mode may fetch remote icon to preview; on save sends `icon` (data URL) + `iconSourceUrl` or explicit nulls to clear.
   - For Upload mode sends data URL directly.
   - If clearing or failed fetch, client sends `icon: null` & `iconSourceUrl: null` to request fallback.
3. Server validation (`zod`) parses request; `tileService` sanitizes data URLs (size, mime, EXIF removal) and optionally fetches favicon if both `icon` and `iconSourceUrl` are absent or cleared.
4. Reordering uses optimistic UI updates + `/tiles/reorder` to persist new order indices.
5. Refresh icon endpoint triggers an on-demand favicon refetch without altering other fields.

## Package: shared

`packages/shared/src/types.ts`

- `Tile` interface: canonical shape; optional icon fields allow absence for fallbacks.
- Consumed via path alias `@hub/shared` in both client & server.

Dependency edges:

- Server imports `Tile` for typing (only example usage at present).
- Client imports `Tile` in components (`TileCard`, `TileGrid`, `Home`), hooks, and API return types.

## Package: server

Structure:

```
src/
  app.ts
  index.ts
  db/prismaClient.ts
  routes/tiles.ts
  services/tileService.ts
  utils/
    favicon.ts
    fetchFavicon.ts (placeholder / unused)
    image.ts
    validation.ts
prisma/schema.prisma
```

### Database (Prisma)

`prisma/schema.prisma` defines model `Tile` with optional `icon` & `iconSourceUrl`. SQLite datasource via `DATABASE_URL`.
`db/prismaClient.ts` (not displayed above but typically instantiates `PrismaClient`).

### Validation Layer

`utils/validation.ts`:

- `tileCreateSchema`: Zod schema with nullable `icon` / `iconSourceUrl` permitting explicit clearing. Required: `title`, `url`.
- `tileUpdateSchema`: `partial()` derivative for PATCH-like semantics via PUT (unspecified fields remain unchanged).
- Exported `TileCreateInput` / `TileUpdateInput` types drive service signatures.

### Icon & Image Utilities

`utils/favicon.ts`:

- `fetchFaviconBase64(pageUrl)`: Attempts common favicon paths (`favicon.ico`, `favicon.png`, etc.). Filters by size (100B < size < 200KB) & returns sanitized base64 data URL; otherwise null.

`utils/image.ts`:

- Constants: `MAX_ICON_BYTES`, `ALLOWED_MIME` controlling limits & allowed MIME types.
- `parseDataUrl(dataUrl)`: Validate structural correctness, MIME, size.
- `stripMetadataAndNormalize(buf, mime)`: Uses `sharp` to rotate, normalize, resize to <=128px, convert to PNG when needed (ICO/GIF), enforce size limit.
- `sanitizeDataUrl(dataUrl)`: Pipeline combining parse + normalize.
- `fetchRemoteImageBase64(url)`: HTTP GET (undici) → validates response MIME/size → normalizes with `stripMetadataAndNormalize`.

### Service Layer

`services/tileService.ts` exposes domain operations:

- `listTiles()`: Ordered fetch.
- `getTile(id)`
- `createTile(data)`: Determines `order` (max+1). Sanitizes provided `icon`. If no `icon` or `iconSourceUrl`, attempts favicon fetch from `url`.
- `updateTile(id, data)`: Sanitizes provided data URL if present; interprets explicit `null` for `icon` / `iconSourceUrl` as clear. If both cleared, attempts favicon fetch for fallback.
- `refreshTileIcon(id)`: On-demand favicon fetch; only replaces `icon` if fetch successful (retains existing otherwise).
- `deleteTile(id)` / `reorderTiles(ids)` transactionally updates `order` indices (1-based persisted index; client may treat zero-based in memory but sets sequential values via index+1).

Internal dependencies:

- `fetchFaviconBase64` (favicon fallback retrieval) used in `createTile`, `updateTile` (when both cleared), and `refreshTileIcon`.
- `sanitizeDataUrl` (uploaded or remote-fetched icon normalization) used in create/update.
- Prisma client for persistence.

### Routing Layer

`routes/tiles.ts` maps HTTP endpoints:

- `GET /api/v1/tiles` → `listTiles`
- `GET /api/v1/tiles/:id` → `getTile`
- `POST /api/v1/tiles` → validate + `createTile`
- `PUT /api/v1/tiles/:id` → validate + `updateTile`
- `DELETE /api/v1/tiles/:id` → `deleteTile`
- `PUT /api/v1/tiles/reorder` → `reorderTiles`
- `PUT /api/v1/tiles/:id/refresh-icon` → `refreshTileIcon`
- `POST /api/v1/tiles/fetch-icon` → pre-fetch remote icon (preview before saving); uses `fetchRemoteImageBase64` directly and returns `{ icon }` or 422.

### Application Initialization

`app.ts`: Sets up Express middleware (CORS, JSON parsing), health endpoint, mounts tiles router, centralized error handler translating Zod & Prisma errors.
`index.ts`: Starts HTTP server on `PORT` (default 4000).

### Error Handling

- Zod validation errors → 400 with issues.
- Prisma not-found (P2025) → 404.
- Generic errors → 500.
- Fetch-icon failures → 422 (semantic: unable to fetch/validate remote icon).

### Data & Control Flow Summary (Server)

Client request → Express route → Zod validation → Service function (business rules & icon logic) → Prisma DB → response (Tile(s)). Icon sanitation & fallback is centralized in service & image utilities, avoiding duplication in routes.

## Package: client

Structure:

```
src/
  api/
    apiClient.ts
    tiles.ts
  hooks/
    useTiles.ts
  components/
    TileFormDialog.tsx
    TileCard.tsx
    TileGrid.tsx
    ConfirmDialog.tsx
  routes/
    Home.tsx
  App.tsx
  main.tsx
```

### API Layer

`api/apiClient.ts`: Axios instance with `baseURL:'/api/v1'`.
`api/tiles.ts`: REST wrappers mapping to server routes.

- `fetchTiles()`
- `createTile(input)`
- `updateTile({ id, data })`
- `deleteTile(id)`
- `reorderTiles(ids)`
- `refreshTileIcon(id)`
- `fetchIconFromUrl(url)` (preview remote icon before editing save)

### Data Hooks (React Query)

`hooks/useTiles.ts`:

- `useTiles()`: Query `['tiles']` list.
- `useCreateTile()`: Mutation with optimistic append (temp id + sequential order). Invalidates on success.
- `useUpdateTile()`: Optimistic merge; interprets `null` icon/iconSourceUrl in mutation input to clear cached values.
- `useDeleteTile()`: Invalidates list after deletion.
- `useReorderTiles()`: Optimistic reordering via local in-memory permutation; invalidates after settle.
- `useRefreshTileIcon()`: After refresh, invalidates list (server may change icon).
- `useFetchIconFromUrl()`: One-off preview icon fetch.

Dependencies:

- All hooks depend on `api/tiles.ts` functions which depend on Axios client.
- Optimistic updates rely on shared `Tile` type consistency.

### UI Components

`TileCard.tsx`:

- Renders single tile as `Card` anchored by a `MuiLink` for native middle/ctrl click.
- Displays uploaded/remote icon (`img`), else first letter fallback.
- Reorder mode: integrates with `@dnd-kit` sortable (`useSortable`) adding drag handle, disabling navigation.
- Exposes edit/delete icon buttons only in reorder mode (intentional gating vs accidental navigation).

`TileGrid.tsx`:

- Responsive `Grid` layout hosting `TileCard` children.
- Wraps reorder mode in DnD context (`DndContext`, `SortableContext`); calculates reorder result and invokes `onReorder(ids)`.

`ConfirmDialog.tsx`:

- Generic confirmation modal for delete operations.

`TileFormDialog.tsx`:

- Central form for create & update.
- State slices: `form` (title,url,category,icon,target), `iconMode` ('upload'|'url'), `iconSourceUrl`, `fetchedIcon` (preview), flags for drag/drop, submission, fetching.
- URL Mode:
  - User supplies remote image URL, clicks "Fetch" to validate & preview (via `useFetchIconFromUrl`).
  - On save: if fetched preview missing but URL provided, will attempt fetch first; on fetch failure sends explicit nulls to force fallback.
  - Clearing URL (empty input): sends `icon:null`, `iconSourceUrl:null`.
- Upload Mode:
  - Accepts image file drag/drop or file picker.
  - Converts to data URL; sends sanitized data later by server.
  - Clearing upload resets `icon` so fallback may apply.
- Edit Initialization:
  - Detects existing `iconSourceUrl` to set initial `iconMode`.
  - Sanitizes out accidental `data:` in `iconSourceUrl` (safety guard).
- Submission Branches ensure correct semantics for create vs update and explicit clearing.
- Refresh button (only in edit) triggers server favicon refresh mutation.
- Loading overlay ensures user sees fetch/save progress.

### Route & App Structure

`routes/Home.tsx`:

- Owns tile collections + mutation handlers.
- Maintains offline mode leveraging localStorage cache to display last successful tiles when network fails (mutations disabled while offline).
- Toggles reorder mode; passes handlers to `TileGrid`.
- Manages add/edit/delete dialogs.

`App.tsx`:

- Sets up `QueryClientProvider`, routing (single route at '/'), and base layout container.

`main.tsx` (not shown but typically React root) likely mounts `<App />` (if present).

### Offline Strategy

- On successful fetch: tiles + timestamp stored under `hub.tiles.cache.v1`.
- On initial load error: attempts to hydrate from cache; shows banner; disables mutations/reordering.

### Optimistic Update Strategy

- Create: pushes temporary tile with generated temp id and expected next order.
- Update: Shallow merges edited fields; clears icon/iconSourceUrl when null provided.
- Reorder: Recomputes local ordering and sets new array immediately; server authoritative order returned after invalidation.

### Icon Lifecycle Summary (Client + Server)

1. Create w/ Upload: client sends data URL → server sanitizes → stores; fallback skipped.
2. Create w/ URL: client fetches remote icon first (preview). If success, sends sanitized data; if skipped or failed fetch, server falls back to favicon.
3. Edit change to new URL icon: remote fetch path same as create; existing icon replaced on success; if fetch fails, cleared to fallback.
4. Clear icon (upload or URL): client sends nulls; server attempts favicon; if favicon not found, leaves icon null (client letter fallback).
5. Refresh icon: server attempts favicon (non-destructive on failure).

## Dependency Graph (Conceptual)

```
Client UI Components → Client Hooks → Client API wrappers → HTTP → Express Routes → Validation (Zod) → Service Layer → Image/Favicon Utils → Prisma (SQLite)
Shared Types ─────────────────────────────^ (imported in both client & server)
```

## Notable Design Decisions

- PUT used for updates with partial schema (`tileUpdateSchema.partial()`) to simplify client; unspecified fields remain unchanged.
- Explicit null semantics distinguish between "leave unchanged" (omit) and "clear" (send null) for icon fields.
- Image sanitation server-side ensures security & size constraints independent of client trustworthiness.
- Optimistic updates minimize perceived latency; invalidation ensures eventual consistency.
- Reordering implemented with id list submission enabling atomic transaction for order fields.
- LocalStorage offline cache chosen for simplicity; no service worker required.

## Extension Points / Future Improvements

- Add pagination or filtering if tile list grows large.
- Introduce authentication (currently open API).
- Add server-side caching for favicons / remote icon fetches.
- Implement rate limiting on fetch-icon endpoint.
- Expand validation for URLs (currently minimal to avoid blocking varied internal LAN hostnames).
- Provide accessibility enhancements (focus management in dialogs, ARIA labels for drag handles beyond tooltip).
- Add tests (unit for utils/image, integration for service layer, React component tests for form logic).

## File-Level Method Reference

(Alphabetical by file)

`server/src/utils/favicon.ts`

- `fetchFaviconBase64(pageUrl)`: Heuristic favicon retrieval.

`server/src/utils/image.ts`

- `parseDataUrl(dataUrl)`
- `stripMetadataAndNormalize(buf, mime)`
- `sanitizeDataUrl(dataUrl)`
- `fetchRemoteImageBase64(url)`

`server/src/utils/validation.ts`

- `tileCreateSchema`
- `tileUpdateSchema`

`server/src/services/tileService.ts`

- `listTiles()`
- `getTile(id)`
- `createTile(data)`
- `updateTile(id,data)`
- `refreshTileIcon(id)`
- `deleteTile(id)`
- `reorderTiles(ids)`

`server/src/routes/tiles.ts` (handlers map to service methods)

`client/src/api/tiles.ts`

- `fetchTiles()`
- `createTile(input)`
- `updateTile({id,data})`
- `deleteTile(id)`
- `reorderTiles(ids)`
- `refreshTileIcon(id)`
- `fetchIconFromUrl(url)`

`client/src/hooks/useTiles.ts`

- `useTiles()`
- `useCreateTile()`
- `useUpdateTile()`
- `useDeleteTile()`
- `useReorderTiles()`
- `useRefreshTileIcon()`
- `useFetchIconFromUrl()`

`client/src/components/TileFormDialog.tsx` (key internal handlers)

- `handleSubmit()` orchestrates fetch-or-save logic, explicit clearing semantics.
- `processFile(file)` reads + sets uploaded icon.

`client/src/components/TileGrid.tsx`

- `handleDragEnd(event)` maps DnD results to ordered id list.

`client/src/components/TileCard.tsx`

- Integration with `useSortable` for drag behavior.

## Reliance Summary

- `TileFormDialog` relies on: `useFetchIconFromUrl`, `useUpdateTile`/`useCreateTile` (via parent), server fetch-icon endpoint.
- `TileCard` relies on presence (or absence) of `tile.icon` and `tile.title` for fallback.
- `TileGrid` relies on `@dnd-kit` for reorder events.
- Hooks rely on API functions, which rely on Express endpoints.
- Service layer relies on Prisma client & image utilities.
- Image utilities rely on `sharp` and `undici`.
- Favicon utility relies on `undici` HTTP fetch and heuristics.

## Operational Notes

- Build: Each package has its own `tsconfig`; client built with Vite; server compiled with `tsc` then run via Node.
- Environment: `DATABASE_URL` must point to SQLite file for Prisma.
- Size constraints: images limited to 200KB; normalized to <=128px PNG (except SVG preserved as-is).
- Security: No auth; trust boundary at server validation & sanitation for icons. Remote fetch uses explicit MIME/size checks.

---

This document should provide enough depth to onboard a new contributor and clarify interplay between modules, data transformations, and control flow.
