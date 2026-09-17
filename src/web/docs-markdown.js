import { marked } from "marked";
import hljs from "highlight.js";
import mermaid from "mermaid";
import "highlight.js/styles/base16/black-metal-dark-funeral.min.css";
import "./docs-markdown.css";

let mermaidReady = false;

function ensureMermaid() {
  if (mermaidReady) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: "default",
    flowchart: { useMaxWidth: false },
    sequence: { useMaxWidth: false },
    gantt: { useMaxWidth: false },
  });
  mermaidReady = true;
}

function defaultEscapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeCodeText(text) {
  return defaultEscapeHtml(text).replace(/<\/pre/gi, "&lt;/pre");
}

marked.use({
  gfm: true,
  breaks: false,
  async: false,
  renderer: {
    code({ text, lang }) {
      try {
        if (lang === "mermaid") {
          return (
            `<div class="mermaid-wrap"><pre class="mermaid">${escapeCodeText(text)}</pre></div>\n`
          );
        }
        const language = lang && hljs.getLanguage(lang) ? lang : null;
        const highlighted = language
          ? hljs.highlight(text, { language }).value
          : hljs.highlightAuto(text).value;
        const cls = language ? `hljs language-${language}` : "hljs";
        return `<pre><code class="${cls}">${highlighted}</code></pre>\n`;
      } catch {
        return `<pre><code class="hljs">${escapeCodeText(text)}</code></pre>\n`;
      }
    },
  },
});

function safeParseMarkdown(markdown, esc) {
  try {
    return marked.parse(String(markdown || ""));
  } catch (err) {
    return renderMarkdownFallback(markdown, err, esc);
  }
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function searchTerms(query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return [];
  const terms = new Set();
  for (const part of q.split(/\s+/)) {
    if (part.length >= 2) terms.add(part);
    for (const ch of part) {
      if (/[\u4e00-\u9fff]/.test(ch)) terms.add(ch);
    }
  }
  return [...terms].sort((a, b) => b.length - a.length);
}

export function injectMatchAnchor(markdown, lineStart) {
  const lines = String(markdown || "").split("\n");
  const idx = Math.max(0, (lineStart || 1) - 1);
  if (idx >= lines.length) return markdown;
  lines.splice(idx, 0, '<span id="doc-anchor" class="doc-match-anchor"></span>');
  return lines.join("\n");
}

function renderMarkdownFallback(markdown, err, esc) {
  const msg = esc(String(err?.message || err || "Markdown parse failed"));
  const raw = esc(String(markdown || ""));
  return (
    `<div class="doc-render-error"><p><strong>Markdown render failed</strong></p><p>${msg}</p></div>` +
    `<pre class="doc-render-fallback">${raw}</pre>`
  );
}

function parseWithRuleRange(markdown, lineStart, lineEnd, esc) {
  const lines = String(markdown || "").split("\n");
  const start = Math.max(0, lineStart - 1);
  const end = Math.min(lines.length - 1, (lineEnd || lineStart) - 1);
  if (start > end || start >= lines.length) {
    return safeParseMarkdown(injectMatchAnchor(markdown, lineStart), esc);
  }
  const before = lines.slice(0, start).join("\n");
  const range = lines.slice(start, end + 1).join("\n");
  const after = lines.slice(end + 1).join("\n");
  let html = "";
  if (before.trim()) html += safeParseMarkdown(before, esc);
  html += `<div class="doc-rule-range" id="doc-anchor">${safeParseMarkdown(range, esc)}</div>`;
  if (after.trim()) html += safeParseMarkdown(after, esc);
  return html;
}

function ruleHighlightTerms(ruleId, claim) {
  const terms = [];
  if (ruleId) terms.push(ruleId);
  const c = String(claim || "").trim();
  if (c.length >= 4 && c.length <= 120) {
    terms.push(c);
  } else if (c.length > 120) {
    const bit = c.split(/[.。!?\n]/)[0].trim();
    if (bit.length >= 4) terms.push(bit.slice(0, 100));
  }
  return terms;
}

function mergeHighlightTerms(query, ruleHighlight) {
  const seen = new Set();
  const out = [];
  for (const term of searchTerms(query)) {
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(term);
  }
  if (ruleHighlight) {
    for (const term of ruleHighlightTerms(ruleHighlight.ruleId, ruleHighlight.claim)) {
      const key = term.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(term);
    }
  }
  return out.sort((a, b) => b.length - a.length);
}

function highlightInElement(root, terms) {
  if (!root || !terms.length) return;
  try {
    const skip = new Set(["SCRIPT", "STYLE", "MARK", "CODE", "PRE"]);
    const pattern = terms.map(escapeRegExp).join("|");
    if (!pattern) return;
    const re = new RegExp(`(${pattern})`, "gi");
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const parent = node.parentElement;
      if (!parent || skip.has(parent.tagName)) continue;
      if (!node.nodeValue || !node.nodeValue.trim()) continue;
      textNodes.push(node);
    }
    for (const node of textNodes) {
      const text = node.nodeValue;
      if (!re.test(text)) {
        re.lastIndex = 0;
        continue;
      }
      re.lastIndex = 0;
      const span = document.createElement("span");
      span.innerHTML = text.replace(re, '<mark class="search-hl">$1</mark>');
      node.replaceWith(...span.childNodes);
    }
  } catch {
    // Highlighting is optional — never break the preview.
  }
}

function markMatchBlock(container) {
  const anchor = container.querySelector("#doc-anchor");
  if (!anchor) return;
  const block =
    anchor.closest("p, li, h1, h2, h3, h4, h5, h6, td, blockquote, pre") ||
    anchor.parentElement;
  block?.classList.add("doc-match-block");
}

function scrollToAnchor(container) {
  const anchor = container.querySelector("#doc-anchor");
  if (!anchor) return;
  requestAnimationFrame(() => {
    anchor.scrollIntoView({ block: "center", behavior: "smooth" });
  });
}

async function renderMermaidBlocks(root) {
  const nodes = root?.querySelectorAll(".mermaid");
  if (!nodes?.length) return;
  ensureMermaid();
  await new Promise((resolve) => requestAnimationFrame(resolve));
  try {
    await mermaid.run({ nodes: [...nodes], suppressErrors: true });
    for (const svg of root.querySelectorAll(".mermaid-wrap svg")) {
      svg.removeAttribute("width");
      svg.style.removeProperty("max-width");
    }
  } catch {
    // Keep source visible if diagram syntax fails.
  }
}

function renderPreviewError(container, { path, heading, content, err, esc, chunk, onRuleClick }) {
  const linksHtml = renderInboundLinks(chunk, esc, onRuleClick);
  const msg = esc(String(err?.message || err || "Preview failed"));
  container.innerHTML =
    '<header class="doc-reader-head">' +
    `<h1>${esc(heading || path || "Document")}</h1>` +
    `<div class="doc-reader-meta">${esc(path || "")}</div>` +
    linksHtml +
    "</header>" +
    `<div class="doc-render-error"><p><strong>Preview failed</strong></p><p>${msg}</p></div>` +
    `<pre class="doc-render-fallback">${esc(String(content || ""))}</pre>`;
  container.querySelectorAll(".doc-links .id-link").forEach(btn => {
    btn.onclick = () => onRuleClick?.(btn.getAttribute("data-rule-id"));
  });
}

export async function renderDocPreview(container, { path, content, chunk, query, ruleHighlight, escapeHtml, onRuleClick }) {
  if (!container) return;
  const esc = escapeHtml || defaultEscapeHtml;
  const heading = chunk?.heading || path;
  try {
    const lineStart = ruleHighlight?.line_start ?? chunk?.line_start;
    const lineEnd = ruleHighlight?.line_end ?? chunk?.line_end;
    const lineMeta = lineStart && lineEnd
      ? ` · L${lineStart}–${lineEnd}`
      : lineStart
        ? ` · L${lineStart}`
        : "";
    const bodyHtml = lineStart
      ? parseWithRuleRange(content, lineStart, lineEnd, esc)
      : safeParseMarkdown(injectMatchAnchor(content, 1), esc);
    const linksHtml = renderInboundLinks(chunk, esc, onRuleClick);
    container.innerHTML =
      '<header class="doc-reader-head">' +
      `<h1>${esc(heading)}</h1>` +
      `<div class="doc-reader-meta">${esc(path)}${lineMeta}</div>` +
      linksHtml +
      "</header>" +
      `<article class="doc-reader-markdown markdown-body">${bodyHtml}</article>`;
    const article = container.querySelector(".doc-reader-markdown");
    try {
      await renderMermaidBlocks(article);
    } catch {
      // Mermaid errors are non-fatal; source stays visible.
    }
    highlightInElement(article, mergeHighlightTerms(query, ruleHighlight));
    try {
      if (!container.querySelector(".doc-rule-range")) markMatchBlock(container);
      scrollToAnchor(container);
    } catch {
      // Anchor helpers are optional.
    }
    container.querySelectorAll(".doc-links .id-link").forEach(btn => {
      btn.onclick = () => onRuleClick?.(btn.getAttribute("data-rule-id"));
    });
  } catch (err) {
    renderPreviewError(container, { path, heading, content, err, esc, chunk, onRuleClick });
  }
}

function renderInboundLinks(chunk, escapeHtml, onRuleClick) {
  const ref = chunk?.referenced_rules || [];
  const cited = chunk?.cited_rules || [];
  if (!ref.length && !cited.length) return "";
  const row = (items, title, kind) => {
    if (!items.length) return "";
    const btns = items.map(r =>
      `<button type="button" class="id-link" data-rule-id="${escapeHtml(r.id)}" title="${escapeHtml(r.claim || r.id)}">${escapeHtml(r.id)}</button>`
    ).join(" ");
    return `<div class="doc-links"><h3>${escapeHtml(title)}</h3><div>${btns}</div></div>`;
  };
  return (
    row(ref, "Referenced imprints (vault sources)", "sources") +
    row(cited, "Cited in markdown", "cited")
  );
}
