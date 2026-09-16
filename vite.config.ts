import type { Connect } from "vite";
import { defineConfig } from "vite";
import { resolve } from "node:path";

const hostUrl = (process.env.IMPRINT_HOST_URL ?? "http://127.0.0.1:9470").replace(/\/$/, "");

function jsonProxy(
  targetBase: string,
  mapPath: (url: string) => string,
): Connect.NextHandleFunction {
  return async (req, res) => {
    const url = req.url ?? "";
    const target = `${targetBase}${mapPath(url)}`;
    try {
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) {
        if (v === undefined || k === "host" || k === "connection") continue;
        if (Array.isArray(v)) headers.set(k, v.join(", "));
        else headers.set(k, v);
      }
      let body: Buffer | undefined;
      if (req.method === "POST" || req.method === "PUT") {
        body = await new Promise((resolveBody, reject) => {
          const chunks: Buffer[] = [];
          req.on("data", (c) => chunks.push(c));
          req.on("end", () => resolveBody(Buffer.concat(chunks)));
          req.on("error", reject);
        });
      }
      const upstream = await fetch(target, { method: req.method ?? "GET", headers, body });
      res.statusCode = upstream.status;
      const ct = upstream.headers.get("content-type");
      if (ct) res.setHeader("Content-Type", ct);
      res.end(Buffer.from(await upstream.arrayBuffer()));
    } catch {
      res.statusCode = 503;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: `imprint host not reachable at ${hostUrl} — run: imprint host start` }));
    }
  };
}

function apiProxy(): Connect.NextHandleFunction {
  return async (req, res, next) => {
    const url = req.url ?? "";
    if (url.startsWith("/api/host/")) {
      jsonProxy(hostUrl, (u) => u.replace(/^\/api\/host/, ""))(req, res, next);
      return;
    }
    if (!url.startsWith("/api/")) {
      next();
      return;
    }
    const targetPath = url.replace(/^\/api/, "") || "/";
    jsonProxy(hostUrl, () => targetPath)(req, res, next);
  };
}

export default defineConfig({
  root: "src/web",
  base: "/",
  build: {
    outDir: resolve(__dirname, "dist/web"),
    emptyOutDir: true,
  },
  server: {
    port: Number(process.env.IMPRINT_PLUGIN_PORT ?? 4173),
    host: "127.0.0.1",
    strictPort: true,
  },
  plugins: [
    {
      name: "desk-dev-api",
      configureServer(server) {
        server.middlewares.use(apiProxy());
        server.middlewares.use("/health", async (_req, res) => {
          try {
            const hostHealth = await fetch(`${hostUrl}/health`).then((r) => r.json());
            const shelves = hostHealth.shelves ?? {};
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                ok: true,
                plugin: "imprint-desk-plugin",
                dev: true,
                hostUrl,
                docsSearch: Boolean(shelves.enabled),
                docsCached: Number(shelves.chunk_count ?? 0) > 0,
                shelves,
              }),
            );
          } catch {
            res.statusCode = 503;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: `imprint host not reachable at ${hostUrl}` }));
          }
        });
      },
    },
  ],
});
