<p align="center">
  <img src="assets/logo.png" width="256" alt="imprint desk logo" />
</p>

<h1 align="center">imprint-desk-plugin</h1>

<p align="center">Live vault dashboard for <a href="https://github.com/SteamedBread2333/imprint">imprint</a>. Full port of the former static <code>memory/dashboard.html</code>: census list, radial relation graph (dandelion layout), filters, URL state, EN/中文, help panel, and rule detail.</p>

## Quick start

```bash
# Terminal 1 — required for any UI (dev or prod)
cd ../imprint && go run ./cmd/imprint host serve

# Terminal 2 — desk plugin
npm install
npm run dev:check && npm run dev   # dev: Vite + hot reload
npm run build && npm run serve     # prod: imprint plugin reload
npm test                           # e2e: host up, /api/graph, bundle MIME
```

Open http://127.0.0.1:4173

## Project layout

```
repo/
  .imprint/
    imprint.yaml          # copy from imprint docs/examples/imprint.yaml
    memory/               # vault rules (default name)
    .shelves/.cache/      # doc index (shelves; gitignore)
  docs/                   # indexed by shelves
```

## With imprint plugin lifecycle

From an imprint project with `.imprint/imprint.yaml`:

```bash
imprint host serve
imprint plugin reload
imprint desk open
```

## Screenshots

<p align="center">Home: census list view (unfiltered).</p>
<img width="1920" height="958" alt="imprint desk list view" src="https://github.com/user-attachments/assets/957e4c4a-e80a-4ae1-9e93-9e83ad3472a2" />

<p align="center">Graph view: radial relation map, scope-colored nodes.</p>
<img width="1920" height="958" alt="imprint desk graph view" src="https://github.com/user-attachments/assets/6011309f-45b8-46f8-b266-3172332f902c" />

<p align="center">Graph view with document notes.</p>
<img width="1920" height="958" alt="image" src="https://github.com/user-attachments/assets/f4bfdc35-f715-491c-b125-a3145daef8b6" />

## Environment

| Variable | Default |
| --- | --- |
| `IMPRINT_PLUGIN_PORT` | `4173` |
| `IMPRINT_HOST_URL` | `http://127.0.0.1:9470` |
| `IMPRINT_VAULT` | set by host |
| `IMPRINT_SHELVES_URL` | set by host when shelves enabled |
| `IMPRINT_DESK_POLL_MS` | `30000` (graph refresh interval) |

Features: IndexedDB graph cache (offline/stale-while-revalidate), 30s polling, docs search tab when shelves is running.

See [OUTLINE.md](./OUTLINE.md) for architecture and phases.
