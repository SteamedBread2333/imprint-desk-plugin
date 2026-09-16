#!/usr/bin/env node
const hostUrl = (process.env.IMPRINT_HOST_URL ?? "http://127.0.0.1:9470").replace(/\/$/, "");
try {
  const r = await fetch(`${hostUrl}/health`);
  if (!r.ok) throw new Error(String(r.status));
  console.log(`imprint host ok: ${hostUrl}`);
} catch {
  console.error(`\nimprint host not running at ${hostUrl}`);
  console.error("Start it first (from imprint repo):\n  go run ./cmd/imprint host serve\n");
  process.exit(1);
}
