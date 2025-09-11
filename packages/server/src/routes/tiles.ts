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
import { fetchFaviconBase64 } from "../utils/favicon";
import { sanitizeDataUrl } from "../utils/image";
import { request } from "undici";

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

// Preview icon resolution without persisting a tile
router.post("/preview-icon", async (req, res, next) => {
  try {
    const { url, iconSourceUrl, uploadedIcon } = req.body as {
      url?: string;
      iconSourceUrl?: string;
      uploadedIcon?: string; // data URL
    };
    let icon: string | undefined;
    if (uploadedIcon?.startsWith("data:")) {
      icon = (await sanitizeDataUrl(uploadedIcon)) || undefined;
    } else if (iconSourceUrl) {
      try {
        const r = await request(iconSourceUrl);
        const ctHeader = r.headers["content-type"];
        const singleCt = Array.isArray(ctHeader) ? ctHeader?.[0] : ctHeader;
        if (singleCt && singleCt.startsWith("image/") && r.statusCode < 400) {
          const maxBytes = 200 * 1024;
          const chunks: Buffer[] = [];
          let total = 0;
          for await (const chunk of r.body as any as AsyncIterable<Buffer>) {
            total += chunk.length;
            if (total > maxBytes) break;
            chunks.push(chunk);
          }
          if (total <= maxBytes) {
            const buf = Buffer.concat(chunks);
            const b64 = buf.toString("base64");
            icon = `data:${singleCt};base64,${b64}`;
          }
        }
      } catch {}
    }
    if (!icon && url) {
      icon = (await fetchFaviconBase64(url)) || undefined;
    }
    res.json({ icon });
  } catch (e) {
    next(e);
  }
});

export default router;
