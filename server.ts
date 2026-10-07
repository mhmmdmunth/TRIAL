import express from "express";
import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Comprehensive health check endpoints for Cloud Run container deployment
  const healthHandler = (_req: express.Request, res: express.Response) => {
    res.status(200).json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
  };

  app.get("/api/health", healthHandler);
  app.get("/health", healthHandler);
  app.get("/healthz", healthHandler);
  app.get("/_ah/health", healthHandler);
  app.get("/livez", healthHandler);
  app.get("/readyz", healthHandler);

  // Source code download endpoint
  const sourceCodeBundlePath = path.join(process.cwd(), "public", "SOURCE_CODE_LENGKAP.txt");
  app.get("/SOURCE_CODE_LENGKAP.txt", (_req, res) => {
    if (fs.existsSync(sourceCodeBundlePath)) {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="SOURCE_CODE_LENGKAP.txt"');
      fs.createReadStream(sourceCodeBundlePath).pipe(res);
    } else {
      res.status(404).send("File SOURCE_CODE_LENGKAP.txt not found");
    }
  });

  app.get("/api/source-code", async (_req, res) => {
    try {
      if (fs.existsSync(sourceCodeBundlePath)) {
        const content = await fsPromises.readFile(sourceCodeBundlePath, "utf-8");
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.send(content);
      } else {
        res.status(404).send("File not found");
      }
    } catch (err) {
      res.status(500).send("Error reading source code bundle");
    }
  });

  // Persistent server disk storage backup endpoints
  const storageFilePath = path.join(process.cwd(), ".data", "shipyard_persistent_storage.json");

  app.get("/api/storage", async (_req, res) => {
    try {
      const data = await fsPromises.readFile(storageFilePath, "utf-8");
      res.status(200).json(JSON.parse(data));
    } catch {
      res.status(200).json({});
    }
  });

  app.post("/api/storage", async (req, res) => {
    try {
      await fsPromises.mkdir(path.dirname(storageFilePath), { recursive: true });
      await fsPromises.writeFile(storageFilePath, JSON.stringify(req.body, null, 2), "utf-8");
      res.status(200).json({ success: true, timestamp: new Date().toISOString() });
    } catch (e) {
      console.error("Error writing persistent storage file:", e);
      res.status(500).json({ error: "Failed to persist storage" });
    }
  });

  const distPath = path.join(process.cwd(), "dist");
  const hasDist = fs.existsSync(path.join(distPath, "index.html"));
  const isProduction = process.env.NODE_ENV === "production" || hasDist;

  // Vite middleware for development, static file serving for production
  if (!isProduction || !hasDist) {
    console.log("[Server] Running in Vite development/fallback middleware mode");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("[Server] Running in Production static mode from /dist");
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (
        req.path.startsWith("/api") ||
        req.path === "/health" ||
        req.path === "/healthz" ||
        req.path === "/_ah/health" ||
        req.path === "/livez" ||
        req.path === "/readyz"
      ) {
        return next();
      }
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(200).send("Application starting up, please refresh...");
      }
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Cloud Run] Server successfully started and listening on http://0.0.0.0:${PORT}`);
  });

  // Graceful shutdown handlers for Cloud Run container lifecycle
  const handleShutdown = (signal: string) => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    server.close(() => {
      console.log("HTTP server closed.");
      process.exit(0);
    });
    setTimeout(() => {
      console.error("Could not close connections in time, forcefully shutting down");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
  process.on("SIGINT", () => handleShutdown("SIGINT"));
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

