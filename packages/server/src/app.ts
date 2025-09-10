import express from "express";
import cors from "cors";
import type { Tile } from "@hub/shared";
import tilesRouter from "./routes/tiles";
import { ZodError } from "zod";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/v1/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/v1/tiles", tilesRouter);

// Error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "validation_error", issues: err.issues });
  }
  if (err.code === "P2025") { // Prisma not found
    return res.status(404).json({ error: "not_found" });
  }
  console.error(err);
  res.status(500).json({ error: "internal_server_error" });
});

// Example function showing shared type usage (not an endpoint)
function _exampleTileFactory(title: string, url: string): Tile {
  return {
    id: "example-id",
    title,
    url,
    createdAt: new Date().toISOString(),
  };
}

export { app };
