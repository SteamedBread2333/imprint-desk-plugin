# imprint-desk-plugin — 项目生成大纲

> Node 独立插件：替代 imprint 静态 `dashboard.html`，做人用的 vault 工作台 UI。  
> 只读宿主 vault HTTP API；不写 `.imprint/memory/`；不索引文档（交给 shelves）。

---

## 0. 宿主项目布局

与 [imprint README §Vault](https://github.com/SteamedBread2333/imprint#vault) 一致：

```
repo/
  .imprint/
    imprint.yaml            # 插件 + host（见 docs/examples/imprint.yaml）
    memory/                 # vault 规则 shard（默认名；可 --vault / IMPRINT_VAULT 覆盖）
    .shelves/.cache/        # shelves SQLite index.db（派生，gitignore）
  docs/                     # 项目文档（shelves roots；imprint 不创建）
```

| 数据 | 真相 | Agent | 人（desk） |
| --- | --- | --- | --- |
| 偏好规则 | `.imprint/memory/` | MCP `find` / `add` / … | host `GET /graph` → desk `/api/graph` |
| 文档 corpus | `docs/` 等 roots | MCP `doc_search` → shelves | Phase 3：`POST shelves/search` |
| 配置 | `.imprint/imprint.yaml` | — | — |

**无旧路径兼容**：不用仓库根 `imprint.yaml`、`.imprint/plugins.yaml`、`memory/.cache/shelves/`。

---

## 1. 定位与边界

| 做 | 不做 |
| --- | --- |
| 图谱 / 列表 / 规则详情 | BM25 文档索引 |
| 读宿主 `GET /graph`、`/rules` | 写 imprint 规则 |
| IndexedDB 缓存 vault graph（Phase 2） | 独立 MCP 进程 |
| 后期同页嵌 shelves 搜索（Phase 3） | 依赖 imprint Go 内部包 |

**capabilities:** `ui`, `vault.read`  
**tools:** `[]`（不向 Agent 注册）

---

## 2. 目录结构

```
imprint-desk-plugin/
  OUTLINE.md                 # 本文件
  README.md
  package.json
  imprint.plugin.json        # 宿主契约 manifest
  tsconfig.json
  vite.config.ts
  scripts/
    smoke.mjs                # e2e：host + /api/graph + bundle MIME
  src/
    cli.ts                   # serve | build 入口
    server/
      index.ts               # HTTP：health、静态 SPA、代理宿主 API
      config.ts              # 环境变量 / CLI 参数解析
      paths.ts               # dist/web 路径与 build 校验
    web/
      index.html
      main.js                # ESM 引导
      dashboard-app.js       # 完整 dashboard（列表 + D3 径向图 + 详情 + i18n + URL 状态）
      styles.css
      idb.js                 # Phase 2：IndexedDB 缓存 graph
  dist/                      # build 产物（gitignore）
```

---

## 3. 契约

### 3.1 `imprint.plugin.json`

```json
{
  "apiVersion": 1,
  "id": "desk",
  "name": "imprint-desk-plugin",
  "version": "0.1.0",
  "capabilities": ["ui", "vault.read"],
  "entry": {
    "start": "node dist/cli.js serve",
    "health": "GET http://127.0.0.1:${port}/health"
  },
  "configSchema": {
    "port": { "type": "number", "default": 4173 },
    "hostUrl": { "type": "string", "default": "http://127.0.0.1:9470" },
    "vault": { "type": "string", "default": "${vault}" }
  },
  "tools": []
}
```

### 3.2 环境变量（宿主 `plugin reload` 注入）

| 变量 | 含义 |
| --- | --- |
| `IMPRINT_PLUGIN_PORT` | 本插件 listen 端口 |
| `IMPRINT_HOST_URL` | 宿主 vault 只读 API 根 URL |
| `IMPRINT_VAULT` | vault 目录（展示用） |
| `IMPRINT_WORKSPACE` | 项目根 |

### 3.3 HTTP 路由（desk 自身）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/health` | `{ ok, plugin, vault, hostUrl }` |
| GET | `/api/graph` | 代理 `GET ${hostUrl}/graph` |
| GET | `/api/rules` | 代理 `GET ${hostUrl}/rules?…` |
| GET | `/api/rules/:id` | 代理 `GET ${hostUrl}/rules/:id` |
| GET | `/*` | Vite 构建的 SPA 静态资源 |

---

## 4. 存储与缓存（必须先定）

三套数据、三种存储，**不要混用 IndexedDB 做文档 search**。

| 域 | 真相来源 | 服务端缓存 | 浏览器缓存（desk） |
| --- | --- | --- | --- |
| **Vault 规则** | `.imprint/memory/imprint-*.md` | **无** — host 每次读盘组装 `GraphData` | Phase 2：**IndexedDB** 存最近一次 `GET /graph` 快照 |
| **Workspace 文档** | `docs/` 等 roots 下的文件 | **shelves** — `.imprint/.shelves/.cache/index.db`（SQLite）+ 进程内 BM25 | **无** — Phase 3 每次 `POST shelves/search`（可 debounce，不建本地索引） |
| **UI 状态** | URL query（已实现） | — | **sessionStorage 可选**；筛选/语言/选中 id 已在 URL，不必 IndexedDB |

### 4.1 Vault graph（desk Phase 2）

- **库名**：`imprint-desk`（IndexedDB）
- **object store**：`graph` — key `current` → `{ generated_at, nodes, edges, cached_at }`
- **object store**：`prefs`（可选）→ `{ labelMode, lang }` 若不想全放 URL
- **失效**：启动时先渲染 IndexedDB 快照（若有），再 `fetch /api/graph`；若 `generated_at` 与线上一致则跳过重绘；否则覆盖
- **刷新**：轮询 host `/health` + 比对 vault mtime，或固定间隔（如 30s）拉 graph — **不用 SSE 除非 host 以后提供**
- **不做**：把 shelves 的 chunk 写进 IndexedDB；把 vault shard 全文写进 IndexedDB

### 4.2 文档 search（desk Phase 3）

- **唯一 search 实现**：shelves 插件（BM25，SQLite `index.db`）
- **desk 角色**：HTTP 客户端 — `POST ${shelvesUrl}/search`，展示 hits；`GET /chunks/:id` 看全文
- **发现 shelves URL**：`.imprint/imprint.yaml` 注入 desk env，或 host 将来 `GET /plugins` 只读 registry（**host 不代理 /search**）
- **Agent 同人不同路**：Agent → imprint-mcp → `doc_search` → 同一 shelves `/search`；人 → desk → 同一 `/search`。**索引只有一份**

### 4.3 明确不引入（desk 侧）

- Redis / 第二套 BM25 / desk 内嵌文档索引
- host 侧 graph 内存缓存（保持只读、无状态，便于多插件）
- 浏览器 IndexedDB 索引 markdown（文档 search 只调 shelves HTTP）

> shelves 服务端使用 SQLite 存 chunk 索引 — 见 shelves-plugin OUTLINE §4；与 desk IndexedDB（仅 vault graph）无关。

---

## 5. 前端数据模型

与宿主 `GraphData` 一致：

```typescript
interface GraphData {
  generated_at: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}
```

节点字段：`id`, `claim`, `scope`, `confidence`, `status`, `reinforcement_count`,  
`supersedes`, `related`, `conflicts_with`, `evidence_log`, `last_touched_at`, `referenced_by`.

---

## 6. 分阶段交付

### Phase 1（当前 MVP）— ✅ 已完成

- [x] 大纲 + manifest + package 脚手架
- [x] `serve`：Express + 静态 `dist/web`
- [x] SPA：完整 dashboard 移植（列表 + D3 径向图 + 详情 + i18n + URL 状态）
- [x] 过滤：status / scope / 文本搜索 / min confidence / 边类型 toggle
- [x] README + e2e smoke

### Phase 2 — vault graph 客户端缓存 — ✅ 已完成

- [x] `src/web/idb.js` — IndexedDB 读写 §4.1
- [x] 启动：stale-while-revalidate（先本地 graph，再拉 host）
- [x] 后台轮询刷新（间隔可配置，默认 30s，`IMPRINT_DESK_POLL_MS`）
- [x] 离线/ host 挂了：只读展示上次 graph + 横幅（loadBanner）

### Phase 3 — shelves 文档搜索（无浏览器 DB）— ✅ 已完成

- [x] `IMPRINT_SHELVES_URL` 注入 + desk config
- [x] Express 代理 `POST /api/docs/search`、`GET /api/docs/chunks/:id` → shelves（不经 host 9470）
- [x] UI：左侧 docs 标签 + 搜索面板 + chunk 预览

---

## 7. 开发与联调

```bash
# 终端 1：imprint 宿主 API（项目根需有 .imprint/imprint.yaml）
cd ../imprint && go run ./cmd/imprint host serve

# 终端 2：desk dev
npm install && npm run dev

# 或生产 serve
npm run build && node dist/cli.js serve --port 4173 --host-url http://127.0.0.1:9470
```

示例配置：[imprint `docs/examples/imprint.yaml`](../imprint/docs/examples/imprint.yaml) → 复制到项目 `.imprint/imprint.yaml`。

---

## 8. 测试清单

- [ ] `/health` 200
- [ ] 无宿主时 SPA 显示明确错误
- [ ] graph 渲染节点数与 `imprint list` 一致
- [ ] 点击节点展示 evidence / backlinks
- [ ] `imprint desk open` 打开浏览器（宿主 CLI）

---

## 9. 发布

- npm 包名：`imprint-desk-plugin`
- bin：`imprint-desk` → `dist/cli.js`
- CI：typecheck + build（可选 vitest smoke）
