import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Package root (imprint-desk-plugin/), whether running from src/ or dist/. */
export function packageRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "..", "..");
}

/** Built SPA directory. Production serve must use this — never src/web. */
export function webDistDir(): string {
  return join(packageRoot(), "dist", "web");
}

export function assertWebBuilt(): string {
  const dir = webDistDir();
  const index = join(dir, "index.html");
  if (!existsSync(index)) {
    throw new Error(
      "desk UI not built — run `npm run build` in imprint-desk-plugin (dist/web/index.html missing)",
    );
  }
  const html = readFileSync(index, "utf8");
  if (html.includes("main.ts")) {
    throw new Error(
      "desk UI build is stale — index.html still references main.ts; run `npm run build`",
    );
  }
  return dir;
}
