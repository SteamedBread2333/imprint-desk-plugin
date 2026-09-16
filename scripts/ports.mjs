/** Default and smoke-test ports — keep in sync with pkg/imprint/defaults.go */
export const LOOPBACK = "127.0.0.1";
export const DEFAULT_HOST_PORT = 9470;
export const DEFAULT_DESK_PORT = 4173;

export const defaultHostURL = () => `http://${LOOPBACK}:${DEFAULT_HOST_PORT}`;

/** Ephemeral ports for smoke.mjs (avoid clashing with dev defaults). */
export const SMOKE = {
  prodDesk: 4175,
  viteDesk: 4176,
  viteDeadHost: 4177,
  host: 19470,
  deadHost: 19999,
};

export const url = (port, path = "") => `http://${LOOPBACK}:${port}${path}`;
