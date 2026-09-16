import { createServer } from "./server/index.js";
import { loadConfig } from "./server/config.js";

const args = process.argv.slice(2);
const cmd = args[0] ?? "serve";

if (cmd !== "serve") {
  console.error("Usage: imprint-desk serve [--port N] [--host-url URL]");
  process.exit(2);
}

const cfg = loadConfig(args.slice(1));
let app;
try {
  app = createServer(cfg);
} catch (err) {
  console.error("imprint-desk:", err instanceof Error ? err.message : err);
  process.exit(1);
}
app.listen(cfg.port, "127.0.0.1", () => {
  console.log(`imprint-desk: http://127.0.0.1:${cfg.port} (host ${cfg.hostUrl})`);
});
