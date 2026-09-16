#!/usr/bin/env node
/**
 * Smoke: production bundle MIME + dev module + /api/graph with imprint host up.
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SMOKE, defaultHostURL, url } from "./ports.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const imprintRoot = join(root, "..", "imprint");

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function kill(proc) {
  if (proc && !proc.killed) proc.kill("SIGTERM");
}

async function waitFor(fetchUrl, ok = (r) => r.ok, tries = 30) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(fetchUrl);
      if (ok(r)) return r;
    } catch {
      /* retry */
    }
    await wait(200);
  }
  throw new Error(`timeout waiting for ${fetchUrl}`);
}

// --- production static server ---
const indexHtml = readFileSync(join(root, "dist/web/index.html"), "utf8");
if (indexHtml.includes("main.ts")) {
  console.error("FAIL: dist/web/index.html still references main.ts");
  process.exit(1);
}

const prod = spawn("node", ["dist/cli.js", "serve", "--port", String(SMOKE.prodDesk)], {
  cwd: root,
  env: { ...process.env, IMPRINT_HOST_URL: defaultHostURL() },
  stdio: ["ignore", "pipe", "pipe"],
});
await wait(600);

try {
  const home = await fetch(url(SMOKE.prodDesk, "/"));
  if (!home.ok) throw new Error(`GET / → ${home.status}`);
  const html = await home.text();
  const jsMatch = html.match(/src="(\/assets\/[^"]+\.js)"/);
  if (!jsMatch) throw new Error("built index.html has no /assets/*.js script");
  const js = await fetch(url(SMOKE.prodDesk, jsMatch[1]));
  const ct = js.headers.get("content-type") ?? "";
  if (!js.ok || !ct.includes("javascript")) {
    throw new Error(`wrong MIME for bundle: ${js.status} ${ct}`);
  }
  const tsProbe = await fetch(url(SMOKE.prodDesk, "/main.ts"));
  if (tsProbe.ok) throw new Error("production must not expose /main.ts");
} finally {
  kill(prod);
}

// --- imprint host + dev /api/graph e2e (isolated port) ---
const hostUrl = url(SMOKE.host);
const host = spawn(
  "go",
  ["run", "./cmd/imprint", "host", "serve", "--listen", `${url(SMOKE.host).replace("http://", "")}`],
  { cwd: imprintRoot, stdio: ["ignore", "pipe", "pipe"] },
);
const vite = spawn("npx", ["vite", "--port", String(SMOKE.viteDesk)], {
  cwd: root,
  env: { ...process.env, IMPRINT_HOST_URL: hostUrl },
  stdio: ["ignore", "pipe", "pipe"],
});

try {
  await waitFor(`${hostUrl}/health`);
  await waitFor(url(SMOKE.viteDesk, "/"));

  const mod = await fetch(url(SMOKE.viteDesk, "/main.js"));
  const modCt = mod.headers.get("content-type") ?? "";
  if (!mod.ok || !modCt.includes("javascript")) {
    throw new Error(`dev /main.js → ${mod.status} ${modCt}`);
  }

  const graph = await fetch(url(SMOKE.viteDesk, "/api/graph"));
  if (!graph.ok) {
    const body = await graph.text();
    throw new Error(`dev GET /api/graph → ${graph.status}: ${body.slice(0, 200)}`);
  }
  const data = await graph.json();
  if (!data.generated_at || !Array.isArray(data.nodes)) {
    throw new Error("dev /api/graph: invalid GraphData shape");
  }
} catch (err) {
  console.error("FAIL:", err.message);
  process.exitCode = 1;
} finally {
  kill(vite);
  kill(host);
}

// host unreachable → 503 with JSON (not opaque 500)
const viteDead = spawn("npx", ["vite", "--port", String(SMOKE.viteDeadHost)], {
  cwd: root,
  env: { ...process.env, IMPRINT_HOST_URL: url(SMOKE.deadHost) },
  stdio: ["ignore", "pipe", "pipe"],
});
await wait(1200);
try {
  if (!process.exitCode) {
    await waitFor(url(SMOKE.viteDeadHost, "/"));
    const down = await fetch(url(SMOKE.viteDeadHost, "/api/graph"));
    if (down.status !== 503) {
      throw new Error(`expected 503 when host unreachable, got ${down.status}`);
    }
    const body = await down.json();
    if (!body.error?.includes("host serve")) {
      throw new Error("503 body missing host serve hint");
    }
  }
} catch (err) {
  console.error("FAIL:", err.message);
  process.exitCode = 1;
} finally {
  kill(viteDead);
}

if (!process.exitCode) {
  console.log("smoke ok: bundle + dev /api/graph e2e + host-unreachable 503");
}
