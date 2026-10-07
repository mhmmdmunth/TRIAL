// server.ts
import express from "express";
import path from "path";
async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });
  const storageFilePath = path.join(process.cwd(), ".data", "shipyard_persistent_storage.json");
  app.get("/api/storage", async (_req, res) => {
    try {
      const fs = await import("fs/promises");
      const data = await fs.readFile(storageFilePath, "utf-8");
      res.status(200).json(JSON.parse(data));
    } catch (e) {
      res.status(200).json({});
    }
  });
  app.post("/api/storage", async (req, res) => {
    try {
      const fs = await import("fs/promises");
      await fs.mkdir(path.dirname(storageFilePath), { recursive: true });
      await fs.writeFile(storageFilePath, JSON.stringify(req.body, null, 2), "utf-8");
      res.status(200).json({ success: true, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    } catch (e) {
      console.error("Error writing persistent storage file:", e);
      res.status(500).json({ error: "Failed to persist storage" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) {
        return next();
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Cloud Run] Server successfully started and listening on http://0.0.0.0:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
