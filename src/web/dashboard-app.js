import { getCachedGraph, putCachedGraph } from "./idb.js";

let renderDocPreviewFn = null;
async function loadDocPreview() {
  if (!renderDocPreviewFn) {
    const mod = await import("./docs-markdown.js");
    renderDocPreviewFn = mod.renderDocPreview;
  }
  return renderDocPreviewFn;
}

let DATA;
const SCOPE_PALETTE = ["#7dba82","#d4b483","#6ec4c0","#e0a04a","#c77d9a","#7aa0c8","#e07060","#a78bfa","#86c56a","#e8c99a","#5b9a8b","#f0c14a"];
const statusBorder = { active: "#e8c99a", dormant: "#7a736c", superseded: "#7aa0c8" };
const MAX_GRAPH = 300;
const OVERVIEW_AT = 40;
const I18N = {
  en: {
    search_ph: "Search claim, id, or scope", search_aria: "Search",
    status_aria: "Status", status_all: "all status", status_active: "active", status_dormant: "dormant", status_superseded: "superseded",
    conf_aria: "Minimum confidence", conf_any: "any confidence",
    scope_aria: "Scope", scope_all: "all scopes",
    view_aria: "Home view", view_list: "list", view_map: "graph",
    view_list_title: "Census", view_map_title: "All nodes on the graph",
    fit: "fit", fit_title: "Fit (F)", labels_title: "Cycle labels (L)", labels: "labels",
    help_title_btn: "Help (?)", clear: "clear", related: "related", super: "supersede", conflict: "conflict",
    scopes: "Scopes", scopes_hint: "A tag keeps rules that include it. Filters stack.",
    no_scopes: "No scopes yet.",
    legend_title: "Relation graph", legend_sub: "colour is scope",
    legend_nodes: "Click a node to re-root · size is confidence · <kbd>?</kbd> help",
    detail_empty: "This panel is for links — who replaces whom, what sits nearby. Pick a colour or a node. <kbd>?</kbd>",
    recipe_home_list: "The whole vault, as a census.",
    recipe_home_map: "Every matching node on the graph.",
    recipe_match: "Showing", chip_search: "search", chip_status: "status", chip_conf: "confidence", chip_scope: "scope", chip_hiding: "hiding",
    ov_lead: "How the vault is weighted. Open the graph for every node, or a bar for one cluster.",
    ov_graph: "View as graph", ov_mass: "Scope mass",
    ov_related: "Related", ov_super: "Supersede", ov_conflict: "Conflict",
    ov_none_related: "No related links.", ov_none_super: "No supersede chains.", ov_none_conflict: "No conflicts.",
    ov_more: "+ {n} more — pick a scope",
    ov_rules: "{n} rules",
    ov_counts: "{active} active · {dormant} dormant · {superseded} superseded · {related} related · {super} supersede · {conflict} conflict",
    stats: "{n} match · {active} active · {dormant} dormant · {superseded} superseded",
    showing: "showing {a} of {b}", nearby: "+{n} nearby",
    node_size: "(size)", evidence: "Evidence", evidence_empty: "No evidence yet.",
    meta_status: "status", meta_conf: "confidence", meta_scope: "scope", meta_reinf: "reinforced",
    meta_super: "supersedes", meta_related: "related", meta_back: "referenced by",
    help_title: "How to read this",
    help_lead: "A <strong>radial relation graph</strong>: the busiest rule in the middle, hops on the rings. Colour is <strong>scope</strong>. Lines are only what the vault wrote down.",
    help_filters: "Filters",
    help_filters_d: "Everything you set has to match. A scope is a tag on the rule. Search looks at id, claim, and tags. Esc widens the view.",
    help_home: "Home",
    help_home_d: "The list / graph switch appears only on the home page, with no filters. List is the census. Graph is every node.",
    help_map: "Graph",
    help_map_d: "Click a node to sit it in the centre. Same-scope seeds gather on a ring. The corner card lists scope colours and edge types.",
    help_edges: "Lines",
    help_edges_d: "<div class=\"help-edges\"><div class=\"edge-key\"><span class=\"swatch line super\" aria-hidden=\"true\"></span>supersede (new → old)</div><div class=\"edge-key\"><span class=\"swatch line related\" aria-hidden=\"true\"></span>related</div><div class=\"edge-key\"><span class=\"swatch line conflict\" aria-hidden=\"true\"></span>conflict</div></div>Uncheck a kind in the bar to hide it.",
    help_labels: "Labels",
    help_labels_d: "Default: labels hidden. <strong>Hover</strong> a node to show its claim. <strong>on</strong> shows all labels; <strong>auto</strong> shows all on small graphs only.",
    help_keys: "Keys",
    help_keys_d: "/ search · F fit · L labels · ? help · Esc<br>scroll zoom · drag pan · click to re-root",
    close: "close", lang_to: "中文", lang_title: "中文",
    mode_rules: "rules", mode_docs: "docs",
    docs_title: "Documents", docs_hint: "Workspace docs via built-in shelves (host API).",
    docs_ph: "Search documentation", docs_aria: "Search docs",
    docs_search_off: "Shelves indexing disabled — search unavailable",
    docs_empty: "No hits.", docs_offline: "Offline — showing cached graph:",
    docs_loading: "Searching…",
    docs_browse_title: "Search workspace documentation",
    docs_browse_lead: "Indexed markdown from shelves roots (typically docs/). Use the search bar above or pick a result on the left.",
    docs_browse_keys: "focus search",
    docs_indexed: "{files} files · {chunks} chunks indexed",
    docs_disabled_title: "Document search unavailable",
    docs_disabled_hint: "Set shelves.enabled: true in .imprint/imprint.yaml, then run imprint up.",
    docs_rebuild_hint: "Docs changed after host started? Run imprint down && imprint up.",
    docs_cached_hint: "{n} cached chunks available read-only while shelves is off.",
    shelves_on: "Shelves on", shelves_off: "Shelves off", shelves_cached: "Shelves off · {n} cached"
  },
  zh: {
    search_ph: "搜索 claim、id 或 scope", search_aria: "搜索",
    status_aria: "状态", status_all: "全部状态", status_active: "active", status_dormant: "dormant", status_superseded: "superseded",
    conf_aria: "最低置信度", conf_any: "不限置信度",
    scope_aria: "范围", scope_all: "全部 scope",
    view_aria: "首页视图", view_list: "列表", view_map: "关系图",
    view_list_title: "普查", view_map_title: "全部节点关系图",
    fit: "适配", fit_title: "适配 (F)", labels_title: "切换标签 (L)", labels: "标签",
    help_title_btn: "帮助 (?)", clear: "清除", related: "关联", super: "替代", conflict: "冲突",
    scopes: "范围", scopes_hint: "点一个标签，留下带它的规则。条件会叠在一起。",
    no_scopes: "还没有 scope。",
    legend_title: "关系图", legend_sub: "颜色是 scope",
    legend_nodes: "点击节点换根 · 点的大小是置信度 · <kbd>?</kbd> 帮助",
    detail_empty: "这边看关系：谁替代谁、谁挨着谁。点一颗颜色或一个节点。<kbd>?</kbd>",
    recipe_home_list: "整库普查。",
    recipe_home_map: "全部命中节点都在关系图上。",
    recipe_match: "同时满足", chip_search: "搜索", chip_status: "状态", chip_conf: "置信度", chip_scope: "范围", chip_hiding: "隐藏",
    ov_lead: "库里的分量。打开关系图看全部节点，或点一条看一个簇。",
    ov_graph: "查看关系图", ov_mass: "范围分量",
    ov_related: "关联", ov_super: "替代", ov_conflict: "冲突",
    ov_none_related: "没有关联。", ov_none_super: "没有替代链。", ov_none_conflict: "没有冲突。",
    ov_more: "另有 {n} 条 — 选一个 scope",
    ov_rules: "{n} 条规则",
    ov_counts: "{active} active · {dormant} dormant · {superseded} superseded · {related} 关联 · {super} 替代 · {conflict} 冲突",
    stats: "{n} 条命中 · {active} active · {dormant} dormant · {superseded} superseded",
    showing: "显示 {a} / {b}", nearby: "+{n} 一跳",
    node_size: "（点的大小）", evidence: "证据", evidence_empty: "还没有证据。",
    meta_status: "状态", meta_conf: "置信度", meta_scope: "范围", meta_reinf: "强化",
    meta_super: "替代", meta_related: "关联", meta_back: "被引用",
    help_title: "怎么看",
    help_lead: "<strong>径向关系图</strong>：最忙的规则在中间，跳数在环上。颜色是 <strong>scope</strong>。线只表示 vault 里写过的关系。",
    help_filters: "筛选",
    help_filters_d: "每个条件都要满足。scope 是规则上的标签。搜索覆盖 id、claim 和标签。Esc 放宽。",
    help_home: "首页",
    help_home_d: "列表 / 关系图开关只在首页出现（没有任何筛选）。列表是普查，关系图是全部节点。",
    help_map: "关系图",
    help_map_d: "点一个节点，它会坐到中心。同 scope 的点会聚在一环。角落卡片列出 scope 颜色与线的图例。",
    help_edges: "线",
    help_edges_d: "<div class=\"help-edges\"><div class=\"edge-key\"><span class=\"swatch line super\" aria-hidden=\"true\"></span>替代（新 → 旧）</div><div class=\"edge-key\"><span class=\"swatch line related\" aria-hidden=\"true\"></span>关联</div><div class=\"edge-key\"><span class=\"swatch line conflict\" aria-hidden=\"true\"></span>冲突</div></div>在筛选条里取消勾选即可藏起。",
    help_labels: "标签",
    help_labels_d: "默认隐藏标签；<strong>悬停</strong>节点才显示 claim。<strong>on</strong> 始终显示；<strong>auto</strong> 仅小图全显示。",
    help_keys: "快捷键",
    help_keys_d: "/ 搜索 · F 适配 · L 标签 · ? 帮助 · Esc<br>滚轮缩放 · 拖拽平移 · 点击换根",
    close: "关闭", lang_to: "EN", lang_title: "English",
    mode_rules: "规则", mode_docs: "文档",
    docs_title: "文档", docs_hint: "内置 shelves 工作区文档（经 host API）。",
    docs_ph: "搜索文档", docs_aria: "搜索文档",
    docs_search_off: "Shelves 已禁用 — 无法搜索",
    docs_empty: "无结果。", docs_offline: "离线 — 显示缓存图谱：",
    docs_loading: "搜索中…",
    docs_browse_title: "搜索工作区文档",
    docs_browse_lead: "来自 shelves 根目录（通常是 docs/）的 markdown。用上方搜索框，或从左侧选一条结果。",
    docs_browse_keys: "聚焦搜索",
    docs_indexed: "已索引 {files} 个文件 · {chunks} 块",
    docs_disabled_title: "文档搜索不可用",
    docs_disabled_hint: "在 .imprint/imprint.yaml 设置 shelves.enabled: true，然后运行 imprint up。",
    docs_rebuild_hint: "host 启动后 docs 有变动？运行 imprint down && imprint up。",
    docs_cached_hint: "Shelves 关闭中，可读 {n} 块缓存。",
    shelves_on: "Shelves 开", shelves_off: "Shelves 关", shelves_cached: "Shelves 关 · 缓存 {n} 块"
  }
};
function defaultView() { return DATA.nodes.length > OVERVIEW_AT ? "list" : "graph"; }
function normalizeView(v) {
  if (v === "graph" || v === "dandelion") return "graph";
  if (v === "list") return "list";
  return defaultView();
}
let lang = "en";
let viewMode = "list";
let labelMode = "off";
let hoverNodeId = null;
let selectedId = null;
let zoomK = 1;
let laidMaxR = 120;
let graphNodes = [];
let graphLinks = [];
let applying = false;
let lastPushed = null;
let edgeIndex = {};
let scopeCounts = {};
let scopeList = [];
let scopesEl, sf;
let host, svg, gRoot, gRings, gLinks, gNodes, zoom;
let appStarted = false;
let pollTimer = null;
let pollIntervalMs = 30000;
let docsSearchEnabled = false;
let docsPanelEnabled = false;
let docSearchTimer = null;
let selectedDocId = null;
let hostVaultHint = "";
let cacheVaultKey = "";
let appMode = "rules";
let shelvesInfo = null;

function t(key, vars) {
  const table = I18N[lang] || I18N.en;
  let s = table[key] || I18N.en[key] || key;
  if (vars) Object.keys(vars).forEach(k => { s = s.split("{" + k + "}").join(vars[k]); });
  return s;
}
function isHome() {
  return !document.getElementById("scopeFilter").value
    && !document.getElementById("q").value.trim()
    && !document.getElementById("status").value
    && document.getElementById("conf").value === "0";
}
function queryString() {
  const p = new URLSearchParams();
  const q = document.getElementById("q").value.trim();
  const st = document.getElementById("status").value;
  const conf = document.getElementById("conf").value;
  const sc = document.getElementById("scopeFilter").value;
  if (q) p.set("q", q);
  if (st) p.set("status", st);
  if (conf && conf !== "0") p.set("conf", conf);
  if (sc) p.set("scope", sc);
  if (viewMode !== defaultView()) p.set("view", viewMode);
  if (!document.getElementById("eRelated").checked) p.set("related", "0");
  if (!document.getElementById("eSuper").checked) p.set("super", "0");
  if (!document.getElementById("eConflict").checked) p.set("conflict", "0");
  if (lang === "zh") p.set("lang", "zh");
  if (appMode === "docs") p.set("mode", "docs");
  if (selectedId) p.set("id", selectedId);
  if (labelMode !== "auto") p.set("labels", labelMode);
  return p.toString();
}
function urlFor(qs) { return qs ? location.pathname + "?" + qs : location.pathname; }
function pushQuery() {
  if (applying) return;
  const qs = queryString();
  if (qs === lastPushed) return;
  lastPushed = qs;
  history.pushState({ qs }, "", urlFor(qs));
}
function replaceQuery() {
  if (applying) return;
  const qs = queryString();
  lastPushed = qs;
  history.replaceState({ qs }, "", urlFor(qs));
}
function applyQuery(search) {
  applying = true;
  const p = new URLSearchParams(search || "");
  document.getElementById("q").value = p.get("q") || "";
  const st = p.get("status") || "";
  const stEl = document.getElementById("status");
  stEl.value = [...stEl.options].some(o => o.value === st) ? st : "";
  const conf = p.get("conf") || "0";
  const confEl = document.getElementById("conf");
  confEl.value = [...confEl.options].some(o => o.value === conf) ? conf : "0";
  const sc = p.get("scope") || "";
  const sfEl = document.getElementById("scopeFilter");
  sfEl.value = [...sfEl.options].some(o => o.value === sc) ? sc : "";
  viewMode = normalizeView(p.get("view"));
  document.getElementById("eRelated").checked = p.get("related") !== "0";
  document.getElementById("eSuper").checked = p.get("super") !== "0";
  document.getElementById("eConflict").checked = p.get("conflict") !== "0";
  lang = p.get("lang") === "zh" ? "zh" : "en";
  appMode = p.get("mode") === "docs" ? "docs" : "rules";
  selectedId = p.get("id") || null;
  const lb = p.get("labels");
  labelMode = (lb === "on" || lb === "off" || lb === "auto") ? lb : "off";
  applying = false;
}
function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.getAttribute("data-i18n")); });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => { el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder"))); });
  document.querySelectorAll("[data-i18n-aria]").forEach(el => { el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria"))); });
  document.querySelectorAll("[data-i18n-title]").forEach(el => { el.setAttribute("title", t(el.getAttribute("data-i18n-title"))); });
  const langBtn = document.getElementById("langBtn");
  langBtn.textContent = t("lang_to");
  langBtn.title = t("lang_title");
  const legendNodes = document.getElementById("legendNodes");
  if (legendNodes) legendNodes.innerHTML = t("legend_nodes");
  document.getElementById("helpTitle").textContent = t("help_title");
  document.getElementById("helpLead").innerHTML = t("help_lead");
  document.getElementById("helpClose").textContent = t("close");
  document.getElementById("helpGrid").innerHTML =
    "<div><dt>" + t("help_filters") + "</dt><dd>" + t("help_filters_d") + "</dd>" +
    "<dt>" + t("help_home") + "</dt><dd>" + t("help_home_d") + "</dd>" +
    "<dt>" + t("help_map") + "</dt><dd>" + t("help_map_d") + "</dd></div>" +
    "<div><dt>" + t("help_edges") + "</dt><dd>" + t("help_edges_d") + "</dd>" +
    "<dt>" + t("help_labels") + "</dt><dd>" + t("help_labels_d") + "</dd>" +
    "<dt>" + t("help_keys") + "</dt><dd class=\"keylist\">" + t("help_keys_d") + "</dd></div>";
  const empty = document.getElementById("detailEmpty");
  if (empty) empty.innerHTML = t("detail_empty");
  if (!scopeList.length) scopesEl.innerHTML = '<p class="empty">' + t("no_scopes") + "</p>";
  if (appMode === "docs") refreshDocsChrome();
}
function commit(mode) {
  render();
  if (mode === "push") pushQuery();
  else if (mode === "replace") replaceQuery();
}

function sizeHost() {
  const w = Math.max(1, host.clientWidth);
  const h = Math.max(1, host.clientHeight);
  svg.attr("width", w).attr("height", h).attr("viewBox", [0, 0, w, h]);
  return { w, h };
}
function localSlice(nodes) {
  const ids = new Set(nodes.map(n => n.id));
  const extra = new Set();
  (DATA.edges || []).forEach(e => {
    if (!edgeOn(e.kind)) return;
    if (ids.has(e.source)) extra.add(e.target);
    if (ids.has(e.target)) extra.add(e.source);
  });
  if (!extra.size) return nodes;
  return DATA.nodes.filter(n => ids.has(n.id) || extra.has(n.id));
}
function pickForGraph(nodes) {
  if (nodes.length <= MAX_GRAPH) return { nodes, truncated: 0 };
  const edged = [];
  const rest = [];
  nodes.forEach(n => (edgeIndex[n.id] ? edged : rest).push(n));
  rest.sort((a, b) => b.confidence - a.confidence);
  const keep = edged.concat(rest).slice(0, MAX_GRAPH);
  return { nodes: keep, truncated: nodes.length - keep.length };
}
function shortId(id) {
  const m = (id || "").match(/(\d+)$/);
  return m ? m[1] : (id || "").replace(/^r-/, "");
}
function shortLabel(n) {
  const claim = (n.claim || "").trim();
  const bit = claim.length <= 34 ? claim : claim.slice(0, 32) + "…";
  return shortId(n.id) + "\n" + bit;
}
function parentScope(n) {
  const sc = sf.value;
  if (sc && (n.scope || []).includes(sc)) return sc;
  if (n.scope && n.scope[0]) return n.scope[0];
  return "";
}
function claimOf(id) {
  const n = DATA.nodes.find(x => x.id === id);
  const c = n ? (n.claim || id) : id;
  return c.length > 48 ? c.slice(0, 46) + "…" : c;
}

function scopeColor(name) {
  const s = name || "untagged";
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return SCOPE_PALETTE[(h >>> 0) % SCOPE_PALETTE.length];
}
function openGraph(scope) {
  if (scope != null) sf.value = scope;
  viewMode = "graph";
  commit("push");
}
function visible(n) {
  const q = document.getElementById("q").value.trim().toLowerCase();
  const st = document.getElementById("status").value;
  const conf = parseFloat(document.getElementById("conf").value);
  const sc = document.getElementById("scopeFilter").value;
  if (st && n.status !== st) return false;
  if (n.confidence < conf) return false;
  if (sc && !(n.scope || []).includes(sc)) return false;
  if (q) {
    const hay = (n.id + " " + n.claim + " " + (n.scope || []).join(" ")).toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}
function filtered() { return DATA.nodes.filter(visible); }
function edgeOn(kind) {
  if (kind === "related") return document.getElementById("eRelated").checked;
  if (kind === "supersedes") return document.getElementById("eSuper").checked;
  if (kind === "conflicts_with") return document.getElementById("eConflict").checked;
  return true;
}
function paintLegend(names) {
  const keys = (names && names.length) ? names : scopeList;
  const box = document.getElementById("legendScopes");
  const focus = document.getElementById("legendFocus");
  const cur = sf.value;
  box.innerHTML = keys.map(s =>
    `<button type="button" class="palette-dot${cur === s ? " on" : ""}" data-scope="${esc(s)}" style="background:${scopeColor(s)}" title="${esc(s)}" aria-label="${esc(s)}" role="listitem"></button>`
  ).join("");
  focus.textContent = "";
  box.querySelectorAll(".palette-dot").forEach(btn => {
    const s = btn.getAttribute("data-scope");
    const n = scopeCounts[s] || 0;
    btn.onmouseenter = () => { focus.innerHTML = `${esc(s)} <span class="n"> · ${n}</span>`; };
    btn.onmouseleave = () => { focus.textContent = ""; };
    btn.onclick = () => openGraph(s);
  });
}
function setHelp(open) {
  const p = document.getElementById("helpPanel");
  p.classList.toggle("open", open);
  p.hidden = !open;
}

function dandelionLayout(nodes, edges) {
  const ids = nodes.map(n => n.id);
  const idset = new Set(ids);
  const adj = {};
  ids.forEach(id => { adj[id] = []; });
  edges.forEach(e => {
    if (!idset.has(e.source) || !idset.has(e.target) || e.source === e.target) return;
    adj[e.source].push(e.target);
    adj[e.target].push(e.source);
  });
  const deg = id => (adj[id] || []).length;
  const seen = new Set();
  const comps = [];
  ids.forEach(id => {
    if (seen.has(id)) return;
    const q = [id];
    seen.add(id);
    const comp = [];
    while (q.length) {
      const u = q.shift();
      comp.push(u);
      (adj[u] || []).forEach(v => {
        if (!seen.has(v)) { seen.add(v); q.push(v); }
      });
    }
    comps.push(comp);
  });
  comps.sort((a, b) => b.length - a.length);
  const pos = {};
  const hubs = [];
  const byId = {};
  nodes.forEach(n => { byId[n.id] = n; });
  const sortRing = ring => ring.sort((a, b) => {
    const sa = parentScope(byId[a] || {}) || "";
    const sb = parentScope(byId[b] || {}) || "";
    return sa === sb ? a.localeCompare(b) : sa.localeCompare(sb);
  });
  const depthsByHub = {};
  function placeComp(comp, ox, oy, scale) {
    let root = comp[0];
    comp.forEach(id => { if (deg(id) > deg(root)) root = id; });
    if (selectedId && comp.indexOf(selectedId) >= 0) root = selectedId;
    hubs.push(root);
    const depth = {};
    depth[root] = 0;
    const q = [root];
    while (q.length) {
      const u = q.shift();
      (adj[u] || []).forEach(v => {
        if (depth[v] === undefined && comp.indexOf(v) >= 0) {
          depth[v] = depth[u] + 1;
          q.push(v);
        }
      });
    }
    comp.forEach(id => { if (depth[id] === undefined) depth[id] = 1; });
    depthsByHub[root] = depth;
    const rings = {};
    comp.forEach(id => {
      const d = depth[id];
      (rings[d] = rings[d] || []).push(id);
    });
    Object.keys(rings).forEach(d => sortRing(rings[d]));
    const baseR = 70 * scale;
    let maxR = 0;
    comp.forEach(id => {
      const d = depth[id];
      if (d === 0) {
        pos[id] = { x: ox, y: oy };
        return;
      }
      const ring = rings[d];
      const i = ring.indexOf(id);
      const n = Math.max(ring.length, 1);
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      const radius = d * baseR * (1 + Math.min(n, 28) / 40);
      maxR = Math.max(maxR, radius);
      pos[id] = { x: ox + Math.cos(angle) * radius, y: oy + Math.sin(angle) * radius };
    });
    return maxR;
  }
  const linked = comps.filter(c => c.length > 1);
  const isolates = comps.filter(c => c.length === 1).map(c => c[0]);
  let maxR = 80;
  if (!linked.length) {
    const n = Math.max(isolates.length, 1);
    isolates.forEach((id, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      const radius = 28 + Math.min(n, 36) * 4;
      pos[id] = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
      maxR = Math.max(maxR, radius);
    });
    if (isolates[0]) hubs.push(isolates[0]);
  } else if (linked.length === 1) {
    maxR = Math.max(maxR, placeComp(linked[0], 0, 0, 1));
    isolates.forEach((id, i) => {
      const n = Math.max(isolates.length, 1);
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      const radius = maxR + 52;
      pos[id] = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
      maxR = radius;
    });
  } else {
    const spread = 220;
    linked.forEach((comp, i) => {
      const angle = (2 * Math.PI * i) / linked.length - Math.PI / 2;
      const r = placeComp(comp, Math.cos(angle) * spread, Math.sin(angle) * spread, 0.72);
      maxR = Math.max(maxR, spread + r);
    });
    isolates.forEach((id, i) => {
      const n = Math.max(isolates.length, 1);
      const angle = (2 * Math.PI * i) / n;
      pos[id] = { x: Math.cos(angle) * spread * 1.6, y: Math.sin(angle) * spread * 1.6 };
    });
  }
  const ringSet = new Set();
  Object.keys(pos).forEach(id => {
    const p = pos[id];
    const r = Math.hypot(p.x, p.y);
    if (r > 20) ringSet.add(Math.round(r / 8) * 8);
  });
  return { pos, hubs, maxR: maxR + 24, rings: [...ringSet].sort((a, b) => a - b) };
}

function listEdges(kind, empty) {
  const rows = (DATA.edges || []).filter(e => e.kind === kind);
  if (!rows.length) return `<p class="empty">${empty}</p>`;
  const extra = rows.length > 16 ? `<p class="empty">${t("ov_more", { n: rows.length - 16 })}</p>` : "";
  return rows.slice(0, 16).map(e =>
    `<div class="chain" data-id="${e.source}">${e.source} → ${e.target}<div class="empty">${claimOf(e.source)}</div></div>`
  ).join("") + extra;
}
function showOverview(nodes) {
  host.classList.add("hidden");
  document.getElementById("hud").classList.add("hidden");
  const ov = document.getElementById("overview");
  ov.classList.remove("hidden");
  const c = { active: 0, dormant: 0, superseded: 0 };
  nodes.forEach(n => { c[n.status] = (c[n.status] || 0) + 1; });
  const kinds = { supersedes: 0, related: 0, conflicts_with: 0 };
  (DATA.edges || []).forEach(e => { kinds[e.kind] = (kinds[e.kind] || 0) + 1; });
  const max = Math.max(1, ...scopeList.map(s => scopeCounts[s]));
  const bars = scopeList.slice(0, 24).map(s => {
    const pct = Math.max(2, Math.round(100 * scopeCounts[s] / max));
    return `<div class="bar-row" data-scope="${s}"><span>${s}</span><div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${scopeColor(s)}"></div></div><span class="count">${scopeCounts[s]}</span></div>`;
  }).join("");
  ov.innerHTML = `
    <h1 class="ov-title">${t("ov_rules", { n: DATA.nodes.length })}</h1>
    <p class="ov-lead">${t("ov_lead")}</p>
    <p class="ov-actions"><button type="button" id="ovGraph">${t("ov_graph")}</button></p>
    <p>${t("ov_counts", { active: c.active || 0, dormant: c.dormant || 0, superseded: c.superseded || 0, related: kinds.related || 0, super: kinds.supersedes || 0, conflict: kinds.conflicts_with || 0 })}</p>
    <h2>${t("ov_mass")}</h2>
    <div class="bars">${bars}</div>
    <div class="chains"><h2>${t("ov_related")}</h2>${listEdges("related", t("ov_none_related"))}</div>
    <div class="chains"><h2>${t("ov_super")}</h2>${listEdges("supersedes", t("ov_none_super"))}</div>
    <div class="chains"><h2>${t("ov_conflict")}</h2>${listEdges("conflicts_with", t("ov_none_conflict"))}</div>
  `;
  ov.querySelectorAll(".bar-row").forEach(row => {
    row.onclick = () => openGraph(row.dataset.scope);
  });
  const ovBtn = document.getElementById("ovGraph");
  if (ovBtn) ovBtn.onclick = () => openGraph("");
  ov.querySelectorAll(".chain").forEach(row => {
    row.onclick = () => jump(row.dataset.id);
  });
}
function applyLabelOpacity() {
  const n = graphNodes.length;
  gNodes.selectAll(".d3-node").each(function(d) {
    let on = false;
    if (labelMode === "on") {
      on = true;
    } else if (labelMode === "auto" && n <= 14) {
      on = true;
    } else if (labelMode === "auto" && zoomK >= 1.15 && (d.hub || d.id === selectedId)) {
      on = true;
    } else if (d.id === selectedId || d.id === hoverNodeId) {
      on = true;
    }
    d3.select(this).select("text").style("opacity", on ? 1 : 0);
  });
}
function fitGraph() {
  const { w, h } = sizeHost();
  const pad = 80;
  const k = Math.max(0.12, Math.min(4, Math.min(w, h) / (2 * laidMaxR + pad)));
  svg.transition().duration(420).call(zoom.transform, d3.zoomIdentity.translate(w / 2, h / 2).scale(k));
}
function showGraph(allFiltered) {
  document.getElementById("overview").classList.add("hidden");
  host.classList.remove("hidden");
  document.getElementById("hud").classList.remove("hidden");
  const picked = pickForGraph(allFiltered);
  const nodes = picked.nodes;
  const ids = new Set(nodes.map(n => n.id));
  const edges = (DATA.edges || []).filter(e => ids.has(e.source) && ids.has(e.target) && edgeOn(e.kind));
  const laid = dandelionLayout(nodes, edges);
  laidMaxR = laid.maxR;
  const hubSet = new Set(laid.hubs);
  graphNodes = nodes.map(n => Object.assign({}, n, laid.pos[n.id] || { x: 0, y: 0 }, {
    hub: hubSet.has(n.id),
    r: 7 + Math.round((n.confidence || 0) * 10) + (hubSet.has(n.id) ? 6 : 0),
    fill: scopeColor(parentScope(n)),
    stroke: statusBorder[n.status] || "#9a9084",
    hot: false
  }));
  const byId = {};
  graphNodes.forEach(n => { byId[n.id] = n; });
  const legendNames = [];
  const legendSeen = new Set();
  graphNodes.forEach(n => {
    const s = parentScope(n);
    if (!s || legendSeen.has(s)) return;
    legendSeen.add(s);
    legendNames.push(s);
  });
  legendNames.sort((a, b) => (scopeCounts[b] || 0) - (scopeCounts[a] || 0));
  paintLegend(legendNames);
  graphLinks = edges.filter(e => byId[e.source] && byId[e.target]).map(e => ({
    source: byId[e.source], target: byId[e.target], kind: e.kind
  }));
  gRings.selectAll("circle").data(laid.rings).join("circle")
    .attr("class", "d3-ring")
    .attr("r", d => d);
  gLinks.selectAll("line").data(graphLinks).join("line")
    .attr("class", d => "d3-link " + d.kind)
    .attr("x1", d => d.source.x).attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x).attr("y2", d => d.target.y)
    .attr("marker-end", d => d.kind === "supersedes" ? "url(#arrow-super)" : null);
  const sel = gNodes.selectAll("g.d3-node").data(graphNodes, d => d.id);
  sel.exit().remove();
  const enter = sel.enter().append("g").attr("class", "d3-node");
  enter.append("circle");
  enter.append("text").attr("class", "d3-label").attr("dy", d => d.r + 12);
  const all = enter.merge(sel);
  all.attr("transform", d => `translate(${d.x},${d.y})`)
    .classed("hub", d => d.hub)
    .classed("hot", d => d.id === selectedId)
    .on("click", (ev, d) => {
      ev.stopPropagation();
      const wasHub = d.hub && selectedId === d.id;
      selectedId = d.id;
      show(d);
      if (!wasHub) commit("push");
      else pushQuery();
    })
    .on("mouseenter", (ev, d) => spotlight(d, ev))
    .on("mouseleave", () => { clearDim(); hideTip(); });
  all.select("circle")
    .attr("r", d => d.r)
    .attr("fill", d => d.fill)
    .attr("stroke", d => d.stroke)
    .attr("stroke-width", d => d.status === "superseded" ? 3 : 2);
  all.select("text").each(function(d) {
    const lines = shortLabel(d).split("\n");
    const t = d3.select(this);
    t.selectAll("tspan").data(lines).join("tspan")
      .attr("x", 0)
      .attr("dy", (line, i) => i === 0 ? 0 : 12)
      .text(line => line);
  });
  sizeHost();
  fitGraph();
  applyLabelOpacity();
  if (selectedId) {
    const n = graphNodes.find(x => x.id === selectedId);
    if (n) show(n);
  }
  return picked;
}

function recipe() {
  const parts = [];
  const q = document.getElementById("q").value.trim();
  const st = document.getElementById("status").value;
  const conf = parseFloat(document.getElementById("conf").value);
  const sc = sf.value;
  if (q) parts.push(`<span class="chip">${t("chip_search")} “${esc(q)}” <button type="button" data-clear="q" aria-label="${t("clear")}">×</button></span>`);
  if (st) parts.push(`<span class="chip">${t("chip_status")} ${esc(st)} <button type="button" data-clear="status">×</button></span>`);
  if (conf > 0) parts.push(`<span class="chip">${t("chip_conf")} ≥ ${conf} <button type="button" data-clear="conf">×</button></span>`);
  if (sc) parts.push(`<span class="chip">${t("chip_scope")} ${esc(sc)} <button type="button" data-clear="scopeFilter">×</button></span>`);
  const off = [];
  if (!document.getElementById("eRelated").checked) off.push(t("related"));
  if (!document.getElementById("eSuper").checked) off.push(t("super"));
  if (!document.getElementById("eConflict").checked) off.push(t("conflict"));
  if (off.length) parts.push(`<span class="chip">${t("chip_hiding")} ${off.join(", ")}</span>`);
  const text = document.getElementById("recipeText");
  if (!parts.length) {
    text.innerHTML = viewMode === "graph" ? t("recipe_home_map") : t("recipe_home_list");
  } else {
    text.innerHTML = `<strong>${t("recipe_match")}</strong> ` + parts.join(" ");
  }
  text.querySelectorAll("[data-clear]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute("data-clear");
      const el = document.getElementById(id);
      if (el) el.value = id === "conf" ? "0" : "";
      commit("push");
    };
  });
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function render() {
  recipe();
  const sc = sf.value;
  document.querySelectorAll(".scope-item").forEach(el => {
    el.classList.toggle("active", el.dataset.scope === sc);
  });
  const nodes = filtered();
  const c = { active: 0, dormant: 0, superseded: 0 };
  nodes.forEach(n => { c[n.status] = (c[n.status] || 0) + 1; });
  const unfiltered = isHome();
  const wantOverview = viewMode === "list" && unfiltered;
  const switchEl = document.getElementById("viewSwitch");
  switchEl.hidden = !unfiltered;
  document.getElementById("viewList").classList.toggle("on", viewMode === "list");
  document.getElementById("viewMap").classList.toggle("on", viewMode === "graph");
  document.getElementById("viewList").setAttribute("aria-pressed", viewMode === "list" ? "true" : "false");
  document.getElementById("viewMap").setAttribute("aria-pressed", viewMode === "graph" ? "true" : "false");
  let extra = "";
  if (wantOverview) {
    showOverview(nodes);
  } else {
    const next = sc ? localSlice(nodes) : nodes;
    const picked = showGraph(next);
    if (picked.truncated) extra = " · " + t("showing", { a: picked.nodes.length, b: next.length });
    else if (sc && next.length > nodes.length) extra = " · " + t("nearby", { n: next.length - nodes.length });
  }
  document.getElementById("stats").textContent =
    t("stats", { n: nodes.length, active: c.active || 0, dormant: c.dormant || 0, superseded: c.superseded || 0 }) + extra;
  document.getElementById("labelBtn").textContent = t("labels") + ": " + labelMode;
}
function hideTip() { document.getElementById("tip").style.display = "none"; }
function showTip(n, ev) {
  if (!n) return;
  const tip = document.getElementById("tip");
  const scopes = (n.scope || []).join(", ") || "—";
  tip.innerHTML = `<div class="tid">${esc(n.id)} · ${esc(n.status)} · ${(n.confidence || 0).toFixed(2)}</div>${esc(n.claim || "")}<div class="empty" style="margin-top:6px">${esc(scopes)}</div>`;
  tip.style.display = "block";
  tip.style.left = Math.min((ev.clientX || 0) + 14, window.innerWidth - 380) + "px";
  tip.style.top = Math.min((ev.clientY || 0) + 14, window.innerHeight - 160) + "px";
}
function jump(id) {
  const n = DATA.nodes.find(x => x.id === id);
  if (!n) return;
  selectedId = id;
  viewMode = "graph";
  if (n.scope && n.scope[0] && !sf.value) sf.value = n.scope[0];
  commit("push");
  show(n);
}
function idLinks(ids) {
  if (!ids || !ids.length) return "—";
  return ids.map(id => `<button type="button" class="id-link" data-id="${id}">${id}</button>`).join(" ");
}
function show(n) {
  if (!n) return;
  selectedId = n.id;
  const ev = (n.evidence_log || []).slice().reverse().map(e =>
    `<li><time>${esc(e.at || "")}</time><strong>${esc(e.kind)}</strong> ${e.text ? "— " + esc(e.text) : ""}</li>`
  ).join("");
  const back = (n.referenced_by || []).map(b =>
    `<button type="button" class="id-link" data-id="${b.id}">${esc(b.id)}</button> <span class="empty">${esc(b.kind)}</span>`
  ).join("<br>");
  document.getElementById("detail").innerHTML = `
    <p class="id">${esc(n.id)}</p>
    <h1 class="claim">${esc(n.claim)}</h1>
    <dl class="meta">
      <dt>${t("meta_status")}</dt><dd><span class="pill ${esc(n.status)}">${esc(n.status)}</span></dd>
      <dt>${t("meta_conf")}</dt><dd>${(n.confidence || 0).toFixed(2)} <span class="empty">${t("node_size")}</span></dd>
      <dt>${t("meta_scope")}</dt><dd>${(n.scope || []).map(s => `<button type="button" class="pill btn" data-scope="${esc(s)}" style="border-color:${scopeColor(s)}">${esc(s)}</button>`).join("") || "—"}</dd>
      <dt>${t("meta_reinf")}</dt><dd>${n.reinforcement_count || 0}</dd>
      <dt>${t("meta_super")}</dt><dd>${idLinks(n.supersedes)}</dd>
      <dt>${t("meta_related")}</dt><dd>${idLinks(n.related)}</dd>
      <dt>${t("meta_back")}</dt><dd>${back || "—"}</dd>
    </dl>
    <h2>${t("evidence")}</h2>
    <ul class="timeline">${ev || "<li class='empty'>" + t("evidence_empty") + "</li>"}</ul>
  `;
  document.getElementById("detail").querySelectorAll(".id-link").forEach(btn => {
    btn.onclick = () => jump(btn.dataset.id);
  });
  document.getElementById("detail").querySelectorAll("[data-scope]").forEach(btn => {
    btn.onclick = () => openGraph(btn.getAttribute("data-scope"));
  });
}
function clearDim() {
  hoverNodeId = null;
  gNodes.selectAll(".d3-node").classed("dim", false).classed("hot", d => d.id === selectedId);
  gLinks.selectAll("line").classed("dim", false);
  applyLabelOpacity();
}
function spotlight(d, ev) {
  hoverNodeId = d.id;
  const neigh = new Set([d.id]);
  graphLinks.forEach(l => {
    if (l.source.id === d.id) neigh.add(l.target.id);
    if (l.target.id === d.id) neigh.add(l.source.id);
  });
  gNodes.selectAll(".d3-node").classed("dim", n => !neigh.has(n.id)).classed("hot", n => n.id === d.id);
  gLinks.selectAll("line").classed("dim", l => l.source.id !== d.id && l.target.id !== d.id);
  applyLabelOpacity();
  showTip(d, ev);
}


function startApp() {
  if (appStarted) return;
  appStarted = true;
  Object.keys(edgeIndex).forEach(k => delete edgeIndex[k]);
  Object.keys(scopeCounts).forEach(k => delete scopeCounts[k]);
  stampGraph(hostVaultHint);

  (DATA.edges || []).forEach(e => {
  edgeIndex[e.source] = (edgeIndex[e.source] || 0) + 1;
    edgeIndex[e.target] = (edgeIndex[e.target] || 0) + 1;
  });

  DATA.nodes.forEach(n => (n.scope || []).forEach(s => { scopeCounts[s] = (scopeCounts[s] || 0) + 1; }));
  scopeList = Object.keys(scopeCounts).sort((a, b) => scopeCounts[b] - scopeCounts[a]);
  scopesEl = document.getElementById("scopes");
  sf = document.getElementById("scopeFilter");
  scopeList.forEach(s => {
    const row = document.createElement("div");
    row.className = "scope-item";
    row.dataset.scope = s;
    row.innerHTML = `<span class="dot" style="background:${scopeColor(s)}"></span><span>${s}</span><span class="count">${scopeCounts[s]}</span>`;
    row.onclick = () => openGraph(s);
    scopesEl.appendChild(row);
    const opt = document.createElement("option");
    opt.value = s; opt.textContent = `${s} (${scopeCounts[s]})`; sf.appendChild(opt);
  });
  if (!scopeList.length) scopesEl.innerHTML = '<p class="empty">No scopes yet.</p>';

  paintLegend(scopeList);

  host = document.getElementById("cy");
  svg = d3.select(host).append("svg");
  gRoot = svg.append("g");
  gRings = gRoot.append("g").attr("class", "rings");
  gLinks = gRoot.append("g").attr("class", "links");
  gNodes = gRoot.append("g").attr("class", "nodes");
  svg.append("defs").append("marker")
    .attr("id", "arrow-super").attr("viewBox", "0 -4 8 8").attr("refX", 10)
    .attr("markerWidth", 7).attr("markerHeight", 7).attr("orient", "auto")
    .append("path").attr("d", "M0,-4L8,0L0,4").attr("fill", "#e07060");
  zoom = d3.zoom().scaleExtent([0.12, 4]).on("zoom", ev => {
    gRoot.attr("transform", ev.transform);
    zoomK = ev.transform.k;
    applyLabelOpacity();
  });
  svg.call(zoom);
  svg.on("dblclick.zoom", null);
  svg.on("dblclick", () => fitGraph());
  svg.on("click", ev => {
    if (ev.target === svg.node()) { clearDim(); hideTip(); }
  });

  document.getElementById("viewList").onclick = () => { viewMode = "list"; commit("push"); };
  document.getElementById("viewMap").onclick = () => { viewMode = "graph"; commit("push"); };
  document.getElementById("clearBtn").onclick = () => {
    document.getElementById("q").value = "";
    document.getElementById("status").value = "";
    document.getElementById("conf").value = "0";
    sf.value = "";
    document.getElementById("eRelated").checked = true;
    document.getElementById("eSuper").checked = true;
    document.getElementById("eConflict").checked = true;
    selectedId = null;
    commit("push");
  };
  document.getElementById("langBtn").onclick = () => {
    lang = lang === "en" ? "zh" : "en";
    applyLang();
    commit("push");
  };
  document.getElementById("fitBtn").onclick = () => fitGraph();
  window.addEventListener("resize", () => { sizeHost(); fitGraph(); });
  document.getElementById("zoomIn").onclick = () => svg.transition().duration(180).call(zoom.scaleBy, 1.2);
  document.getElementById("zoomOut").onclick = () => svg.transition().duration(180).call(zoom.scaleBy, 1 / 1.2);
  document.getElementById("labelBtn").onclick = () => {
    labelMode = labelMode === "off" ? "on" : labelMode === "on" ? "auto" : "off";
    document.getElementById("labelBtn").textContent = t("labels") + ": " + labelMode;
    applyLabelOpacity();
    pushQuery();
  };
  document.getElementById("helpBtn").onclick = () => setHelp(true);
  document.getElementById("helpClose").onclick = () => setHelp(false);
  document.getElementById("helpPanel").onclick = e => { if (e.target.id === "helpPanel") setHelp(false); };
  let searchTimer = null;
  document.getElementById("q").addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => commit("push"), 320);
  });
  ["status", "conf", "scopeFilter", "eRelated", "eSuper", "eConflict"].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener("change", () => commit("push"));
  });
  window.addEventListener("popstate", e => {
    applyQuery(e.state && e.state.qs != null ? e.state.qs : location.search.slice(1));
    applyLang();
    if (docsPanelEnabled) setAppMode(appMode, false);
    render();
  });
  document.addEventListener("keydown", e => {
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA")) {
      if (e.key === "Escape") { e.target.blur(); return; }
      return;
    }
    if (e.key === "?" || (e.key === "/" && e.shiftKey)) { e.preventDefault(); setHelp(!document.getElementById("helpPanel").classList.contains("open")); }
    else if (e.key === "/") {
      e.preventDefault();
      if (appMode === "docs" && docsPanelEnabled) document.getElementById("docQ").focus();
      else document.getElementById("q").focus();
    }
    else if (e.key === "f" || e.key === "F") { fitGraph(); }
    else if (e.key === "l" || e.key === "L") { document.getElementById("labelBtn").click(); }
    else if (e.key === "Escape") {
      if (document.getElementById("helpPanel").classList.contains("open")) setHelp(false);
      else document.getElementById("clearBtn").click();
    }
  });
}

function setLoadBanner(msg, show) {
  const banner = document.getElementById("loadBanner");
  if (!show) {
    banner.classList.add("hidden");
    banner.textContent = "";
    return;
  }
  banner.classList.remove("hidden");
  banner.textContent = msg;
}

function stampGraph(vaultHint) {
  const el = document.getElementById("stamp");
  const date = DATA && DATA.generated_at ? DATA.generated_at.slice(0, 10) : "";
  const n = DATA && DATA.nodes ? DATA.nodes.length : 0;
  let tail = date;
  if (vaultHint) tail += (tail ? " · " : "") + vaultHint.replace(/^.*\//, "…/");
  if (n === 0 && vaultHint) tail += " · 0 rules";
  el.textContent = tail;
  el.title = vaultHint || "";
}

async function fetchGraphRemote() {
  const res = await fetch("/api/graph");
  if (!res.ok) {
    let msg = "HTTP " + res.status;
    try {
      const err = await res.json();
      if (err.error) msg = err.error;
    } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

function mountGraph(data) {
  const changed = !DATA || DATA.generated_at !== data.generated_at;
  DATA = data;
  stampGraph(hostVaultHint);
  if (!appStarted) {
    viewMode = defaultView();
    startApp();
    applyQuery(location.search.slice(1));
    applyLang();
    commit("replace");
    if (selectedId) {
      const n = DATA.nodes.find(x => x.id === selectedId);
      if (n) show(n);
    } else if (DATA.nodes.length && DATA.nodes.length <= OVERVIEW_AT) {
      show(DATA.nodes[0]);
    }
  } else if (changed) {
    commit("replace");
  }
}

async function refreshGraph(fromPoll) {
  try {
    const data = await fetchGraphRemote();
    setLoadBanner("", false);
    mountGraph(data);
    if (cacheVaultKey) await putCachedGraph(cacheVaultKey, data).catch(() => {});
  } catch (err) {
    if (DATA) {
      setLoadBanner(t("docs_offline") + " " + err.message, true);
    } else {
      throw err;
    }
  }
  if (fromPoll && appStarted) {
    /* graph already updated inside mountGraph when changed */
  }
}

export function applyEarlyMode() {
  const p = new URLSearchParams(location.search);
  if (p.get("mode") !== "docs") return;
  document.body.classList.add("docs-mode");
  document.getElementById("recipe")?.classList.add("hidden");
  document.getElementById("rulesMain")?.classList.add("hidden");
  document.getElementById("rulesMain")?.setAttribute("aria-hidden", "true");
  document.getElementById("docsMain")?.classList.remove("hidden");
  document.getElementById("docsMain")?.setAttribute("aria-hidden", "false");
  document.getElementById("rulesToolbar")?.classList.add("hidden");
  document.getElementById("docsToolbar")?.classList.remove("hidden");
  document.getElementById("modeRules")?.classList.remove("on");
  document.getElementById("modeDocs")?.classList.remove("hidden");
  document.getElementById("modeDocs")?.classList.add("on");
  appMode = "docs";
}

function setAppMode(mode, syncUrl) {
  if (mode !== "docs") mode = "rules";
  if (mode === "docs" && !docsPanelEnabled) mode = "rules";
  appMode = mode;
  const rules = mode === "rules";
  document.body.classList.toggle("docs-mode", !rules);
  document.getElementById("recipe").classList.toggle("hidden", !rules);
  document.getElementById("rulesMain").classList.toggle("hidden", !rules);
  document.getElementById("rulesMain").setAttribute("aria-hidden", rules ? "false" : "true");
  document.getElementById("docsMain").classList.toggle("hidden", rules);
  document.getElementById("docsMain").setAttribute("aria-hidden", rules ? "true" : "false");
  document.getElementById("rulesToolbar").classList.toggle("hidden", !rules);
  document.getElementById("docsToolbar").classList.toggle("hidden", rules);
  document.getElementById("modeRules").classList.toggle("on", rules);
  document.getElementById("modeDocs").classList.toggle("on", !rules);
  document.getElementById("modeRules").setAttribute("aria-selected", rules ? "true" : "false");
  document.getElementById("modeDocs").setAttribute("aria-selected", rules ? "false" : "true");
  if (!rules) {
    refreshDocsChrome();
    const docQ = document.getElementById("docQ");
    if (docQ.value.trim()) runDocSearch(docQ.value);
    else docQ.focus();
  }
  if (syncUrl !== false) pushQuery();
}

function refreshDocsChrome() {
  const meta = document.getElementById("docsMeta");
  const notice = document.getElementById("docsNotice");
  const stats = document.getElementById("docsStats");
  const s = shelvesInfo || {};
  const chunks = Number(s.chunk_count ?? 0);
  const files = Number(s.file_count ?? 0);
  if (s.enabled && chunks > 0) {
    meta.textContent = t("docs_indexed", { files, chunks });
  } else {
    meta.textContent = t("docs_hint");
  }
  if (stats) {
    stats.textContent = s.enabled
      ? (chunks > 0 ? t("docs_indexed", { files, chunks }) : t("docs_search_off"))
      : (chunks > 0 ? t("shelves_cached", { n: chunks }) : t("shelves_off"));
  }
  if (!notice) return;
  if (docsSearchEnabled) {
    notice.classList.add("hidden");
    notice.innerHTML = "";
    return;
  }
  notice.classList.remove("hidden");
  notice.className = "docs-notice off";
  let body = t("docs_disabled_hint");
  if (chunks > 0) body += " " + t("docs_cached_hint", { n: chunks });
  notice.innerHTML = "<b>" + escapeHtml(t("docs_disabled_title")) + "</b>" + escapeHtml(body);
}

function showDocsEmptyState() {
  const preview = document.getElementById("docPreview");
  preview.innerHTML =
    '<div class="docs-empty-state" id="docsEmptyState">' +
    "<h3>" + escapeHtml(t("docs_browse_title")) + "</h3>" +
    "<p>" + escapeHtml(t("docs_browse_lead")) + "</p>" +
    '<p class="docs-kbd"><kbd>/</kbd> ' + escapeHtml(t("docs_browse_keys")) + "</p></div>";
}

async function runDocSearch(q) {
  const hitsEl = document.getElementById("docHits");
  if (!q.trim()) {
    hitsEl.innerHTML = "";
    selectedDocId = null;
    showDocsEmptyState();
    return;
  }
  if (!docsSearchEnabled) {
    hitsEl.innerHTML = '<p class="empty">' + escapeHtml(t("docs_search_off")) + "</p>";
    showDocsEmptyState();
    return;
  }
  hitsEl.innerHTML = '<p class="empty">' + t("docs_loading") + "</p>";
  try {
    const res = await fetch("/api/docs/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q, top_k: 12 }),
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const hits = data.hits || [];
    if (!hits.length) {
      hitsEl.innerHTML = '<p class="empty">' + t("docs_empty") + "</p>";
      showDocsEmptyState();
      return;
    }
    hitsEl.innerHTML = hits.map(h =>
      '<div class="doc-hit' + (h.id === selectedDocId ? " on" : "") + '" data-id="' + escapeHtml(h.id) + '">' +
      "<b>" + escapeHtml(h.heading || h.path) + "</b>" +
      "<small>" + escapeHtml(h.path) + " · " + h.score.toFixed(2) + "</small>" +
      "<p>" + escapeHtml(h.snippet || "") + "</p></div>"
    ).join("");
    hitsEl.querySelectorAll(".doc-hit").forEach(el => {
      el.onclick = () => showDocChunk(el.getAttribute("data-id"));
    });
    if (!selectedDocId || !hits.some(h => h.id === selectedDocId)) {
      showDocChunk(hits[0].id);
    }
  } catch (err) {
    hitsEl.innerHTML = '<p class="empty">' + escapeHtml(String(err.message)) + "</p>";
  }
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function showDocChunk(id) {
  selectedDocId = id;
  document.querySelectorAll(".doc-hit").forEach(el => {
    el.classList.toggle("on", el.getAttribute("data-id") === id);
  });
  const preview = document.getElementById("docPreview");
  preview.innerHTML = "<p class=\"empty\">" + t("docs_loading") + "</p>";
  const query = document.getElementById("docQ")?.value || "";
  try {
    const chunkRes = await fetch("/api/docs/chunks/" + encodeURIComponent(id));
    if (!chunkRes.ok) throw new Error("HTTP " + chunkRes.status);
    const chunk = await chunkRes.json();
    const fileRes = await fetch(
      "/api/docs/file?path=" + encodeURIComponent(chunk.path || ""),
    );
    if (!fileRes.ok) throw new Error("HTTP " + fileRes.status);
    const file = await fileRes.json();
    const renderDocPreview = await loadDocPreview();
    await renderDocPreview(preview, {
      path: file.path || chunk.path,
      content: file.content || "",
      chunk,
      query,
      escapeHtml,
    });
  } catch (err) {
    preview.innerHTML = '<p class="empty">' + escapeHtml(String(err.message)) + "</p>";
  }
}

function refreshShelvesStatus(shelves) {
  if (shelves) shelvesInfo = shelves;
  const el = document.getElementById("shelvesStatus");
  if (!el) return;
  if (!shelvesInfo) {
    el.classList.add("hidden");
    return;
  }
  el.classList.remove("hidden");
  const chunks = Number(shelvesInfo.chunk_count ?? 0);
  if (shelvesInfo.enabled) {
    el.textContent = t("shelves_on");
    el.className = "shelves-badge on";
    el.title = chunks > 0 ? `Shelves enabled · ${chunks} chunks` : "Shelves enabled · awaiting index";
    if (appMode === "docs") refreshDocsChrome();
    return;
  }
  if (chunks > 0) {
    el.textContent = t("shelves_cached", { n: chunks });
    el.className = "shelves-badge off";
    el.title = `Shelves disabled · ${chunks} cached chunks (read-only)`;
    if (appMode === "docs") refreshDocsChrome();
    return;
  }
  el.textContent = t("shelves_off");
  el.className = "shelves-badge off";
  el.title = "Shelves disabled";
  if (appMode === "docs") refreshDocsChrome();
}

function initDocsSearch() {
  if (!docsPanelEnabled) return;
  document.getElementById("modeDocs").classList.remove("hidden");
  document.getElementById("modeRules").onclick = () => setAppMode("rules");
  document.getElementById("modeDocs").onclick = () => setAppMode("docs");
  document.getElementById("shelvesStatus").onclick = () => setAppMode("docs");
  const docQ = document.getElementById("docQ");
  if (!docsSearchEnabled) {
    docQ.disabled = true;
    docQ.placeholder = t("docs_search_off");
  } else {
    docQ.disabled = false;
    docQ.addEventListener("input", () => {
      clearTimeout(docSearchTimer);
      docSearchTimer = setTimeout(() => runDocSearch(docQ.value), 320);
    });
  }
  showDocsEmptyState();
  refreshDocsChrome();
  if (appMode === "docs") setAppMode("docs", false);
}

export async function boot() {
  let hostUp = false;
  try {
    const health = await fetch("/health");
    if (health.ok) {
      const h = await health.json();
      docsSearchEnabled = Boolean(h.docsSearch);
      docsPanelEnabled = docsSearchEnabled || Boolean(h.docsCached);
      if (h.shelves) refreshShelvesStatus(h.shelves);
      if (h.pollIntervalMs) pollIntervalMs = h.pollIntervalMs;
      cacheVaultKey = h.vault || "";
    }
    const hostHealth = await fetch("/api/host/health");
    hostUp = hostHealth.ok;
    if (hostHealth.ok) {
      const hh = await hostHealth.json();
      hostVaultHint = hh.vault || "";
      if (hh.vault) cacheVaultKey = hh.vault;
      if (hh.shelves) refreshShelvesStatus(hh.shelves);
    } else if (!cacheVaultKey) {
      hostVaultHint = "";
    }
  } catch (_) {}

  const cached =
    !hostUp && cacheVaultKey ? await getCachedGraph(cacheVaultKey).catch(() => null) : null;
  if (cached && Array.isArray(cached.nodes)) {
    mountGraph(cached);
    setLoadBanner(
      (lang === "zh"
        ? "离线快照（host 未运行）。请在该项目目录运行 imprint up，然后硬刷新（Cmd+Shift+R）。vault: "
        : "Offline snapshot (host not running). Run imprint up in the project directory, then hard-refresh (Cmd+Shift+R). vault: ") +
        (cacheVaultKey || "?"),
      true,
    );
  }

  try {
    await refreshGraph(false);
  } catch (err) {
    if (cached && Array.isArray(cached.nodes)) {
      setLoadBanner(t("docs_offline") + " " + err.message, true);
    } else {
      throw err;
    }
  }

  initDocsSearch();
  stampGraph(hostVaultHint);
  if (DATA && DATA.nodes && DATA.nodes.length === 0 && hostVaultHint) {
    setLoadBanner(
      (lang === "zh"
        ? "当前 vault 为空（" + hostVaultHint + "）。若在 memory-test 测试，请先 cd memory-test 再 imprint host serve；或 go run ./cmd/seed-memory-test ../memory-test"
        : "Vault is empty (" + hostVaultHint + "). For memory-test: cd memory-test && imprint host serve; or seed with go run ./cmd/seed-memory-test ../memory-test"),
      true,
    );
  }
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => refreshGraph(true), pollIntervalMs);
}
