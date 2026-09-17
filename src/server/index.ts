import express from "express";
import { join } from "node:path";
import type { DeskConfig } from "./config.js";
import { assertWebBuilt } from "./paths.js";

async function proxyJson(hostUrl: string, path: string, init?: RequestInit) {
  const res = await fetch(`${hostUrl}${path}`, init);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`host ${res.status}: ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

export function createServer(cfg: DeskConfig) {
  const staticDir = assertWebBuilt();
  const app = express();
  app.use(express.json());

  app.get("/health", async (_req, res) => {
    try {
      const hostHealth = await proxyJson(cfg.hostUrl, "/health");
      const shelves = hostHealth.shelves ?? {};
      res.json({
        ok: true,
        plugin: "imprint-desk-plugin",
        vault: cfg.vault,
        hostUrl: cfg.hostUrl,
        docsSearch: Boolean(shelves.enabled),
        docsCached: Number(shelves.chunk_count ?? 0) > 0,
        shelves,
        pollIntervalMs: cfg.pollIntervalMs,
      });
    } catch (err) {
      res.status(502).json({ error: String(err) });
    }
  });

  app.get("/api/host/health", async (_req, res) => {
    try {
      const data = await proxyJson(cfg.hostUrl, "/health");
      res.json(data);
    } catch (err) {
      res.status(502).json({ error: String(err) });
    }
  });

  app.get("/api/graph", async (_req, res) => {
    try {
      const data = await proxyJson(cfg.hostUrl, "/graph");
      res.json(data);
    } catch (err) {
      res.status(502).json({ error: String(err) });
    }
  });

  app.get("/api/graph/unified", async (req, res) => {
    try {
      const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
      const data = await proxyJson(cfg.hostUrl, `/graph/unified${qs}`);
      res.json(data);
    } catch (err) {
      res.status(502).json({ error: String(err) });
    }
  });

  app.get("/api/rules", async (req, res) => {
    try {
      const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
      const data = await proxyJson(cfg.hostUrl, `/rules${qs}`);
      res.json(data);
    } catch (err) {
      res.status(502).json({ error: String(err) });
    }
  });

  app.get("/api/rules/:id", async (req, res) => {
    try {
      const data = await proxyJson(cfg.hostUrl, `/rules/${encodeURIComponent(req.params.id)}`);
      res.json(data);
    } catch (err) {
      res.status(502).json({ error: String(err) });
    }
  });

  app.get("/api/docs/graph", async (_req, res) => {
    try {
      const data = await proxyJson(cfg.hostUrl, "/docs/graph");
      res.json(data);
    } catch (err) {
      res.status(502).json({ error: String(err) });
    }
  });

  app.post("/api/docs/search", async (req, res) => {
    try {
      const data = await proxyJson(cfg.hostUrl, "/docs/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body ?? {}),
      });
      res.json(data);
    } catch (err) {
      res.status(502).json({ error: String(err) });
    }
  });

  app.get("/api/docs/chunks/:id", async (req, res) => {
    try {
      const data = await proxyJson(
        cfg.hostUrl,
        `/docs/chunks/${encodeURIComponent(req.params.id)}`,
      );
      res.json(data);
    } catch (err) {
      res.status(502).json({ error: String(err) });
    }
  });

  app.get("/api/docs/file", async (req, res) => {
    try {
      const path = String(req.query.path ?? "");
      const qs = path ? `?path=${encodeURIComponent(path)}` : "";
      const data = await proxyJson(cfg.hostUrl, `/docs/file${qs}`);
      res.json(data);
    } catch (err) {
      res.status(502).json({ error: String(err) });
    }
  });

  app.get("/api/docs/stats", async (_req, res) => {
    try {
      const data = await proxyJson(cfg.hostUrl, "/docs/stats");
      res.json(data);
    } catch (err) {
      res.status(502).json({ error: String(err) });
    }
  });

  app.use(
    express.static(staticDir, {
      index: false,
      setHeaders(res, filePath) {
        if (filePath.endsWith(".js")) {
          res.setHeader("Content-Type", "application/javascript; charset=utf-8");
        } else if (filePath.endsWith(".css")) {
          res.setHeader("Content-Type", "text/css; charset=utf-8");
        }
      },
    }),
  );

  app.get("*", (req, res) => {
    if (req.path.includes(".")) {
      res.status(404).type("text/plain").send("Not found");
      return;
    }
    res.sendFile(join(staticDir, "index.html"));
  });

  return app;
}
