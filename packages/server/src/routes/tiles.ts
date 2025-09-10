import { Router } from "express";
import { tileCreateSchema, tileUpdateSchema } from "../utils/validation";
import {
  listTiles,
  getTile,
  createTile,
  updateTile,
  deleteTile,
  reorderTiles,
  refreshTileIcon,
} from "../services/tileService";
import { fetchRemoteImageBase64 } from "../utils/image";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const tiles = await listTiles();
    res.json({ tiles });
  } catch (e) {
    next(e);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const tile = await getTile(req.params.id);
    if (!tile) return res.status(404).json({ error: "Not found" });
    res.json({ tile });
  } catch (e) {
    next(e);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const parsed = tileCreateSchema.parse(req.body);
    const tile = await createTile(parsed);
    res.status(201).json({ tile });
  } catch (e) {
    next(e);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const parsed = tileUpdateSchema.parse(req.body);
    const tile = await updateTile(req.params.id, parsed);
    res.json({ tile });
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await deleteTile(req.params.id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

router.put("/reorder", async (req, res, next) => {
  try {
    const ids = req.body.ids as string[] | undefined;
    if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string")) {
      return res.status(400).json({ error: "Invalid ids array" });
    }
    const tiles = await reorderTiles(ids);
    res.json({ tiles });
  } catch (e) {
    next(e);
  }
});

router.put("/:id/refresh-icon", async (req, res, next) => {
  try {
    const tile = await refreshTileIcon(req.params.id);
    if (!tile) return res.status(404).json({ error: "Not found" });
    res.json({ tile });
  } catch (e) {
    next(e);
  }
});

router.post("/fetch-icon", async (req, res, next) => {
  try {
    const { url } = req.body as { url?: string };
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "url required" });
    }
    const icon = await fetchRemoteImageBase64(url);
    if (!icon) return res.status(422).json({ error: "Could not fetch image" });
    res.json({ icon });
  } catch (e) {
    next(e);
  }
});

export default router;
