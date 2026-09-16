export interface DeskConfig {
  port: number;
  hostUrl: string;
  vault: string;
  pollIntervalMs: number;
}

export function loadConfig(args: string[]): DeskConfig {
  let port = Number(process.env.IMPRINT_PLUGIN_PORT ?? "4173");
  let hostUrl = process.env.IMPRINT_HOST_URL ?? "http://127.0.0.1:9470";
  const vault = process.env.IMPRINT_VAULT ?? "";
  let pollIntervalMs = Number(process.env.IMPRINT_DESK_POLL_MS ?? "30000");

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--port" && args[i + 1]) {
      port = Number(args[++i]);
    } else if (a.startsWith("--port=")) {
      port = Number(a.slice(7));
    } else if (a === "--host-url" && args[i + 1]) {
      hostUrl = args[++i];
    } else if (a.startsWith("--host-url=")) {
      hostUrl = a.slice(11);
    }
  }

  return {
    port,
    hostUrl: hostUrl.replace(/\/$/, ""),
    vault,
    pollIntervalMs: Number.isFinite(pollIntervalMs) && pollIntervalMs > 0 ? pollIntervalMs : 30000,
  };
}
