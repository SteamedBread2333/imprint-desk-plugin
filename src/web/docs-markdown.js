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

marked.use({
  gfm: true,
  breaks: false,
  async: false,
  renderer: {
    code({ text, lang }) {
      if (lang === "mermaid") {
        return (
          `<div class="mermaid-wrap"><pre class="mermaid">${text.replace(/<\/pre/gi, "&lt;/pre")}</pre></div>\n`
        );
      }
      const language = lang && hljs.getLanguage(lang) ? lang : null;
      const highlighted = language
        ? hljs.highlight(text, { language }).value
        : hljs.highlightAuto(text).value;
      const cls = language ? `hljs language-${language}` : "hljs";
      return `<pre><code class="${cls}">${highlighted}</code></pre>\n`;
    },
  },
});

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

function highlightInElement(root, terms) {
  if (!root || !terms.length) return;
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

export async function renderDocPreview(container, { path, content, chunk, query, escapeHtml }) {
  const heading = chunk?.heading || path;
  const lineMeta =
    chunk?.line_start && chunk?.line_end
      ? ` · L${chunk.line_start}–${chunk.line_end}`
      : "";
  const md = injectMatchAnchor(content, chunk?.line_start || 1);
  const bodyHtml = marked.parse(md);
  container.innerHTML =
    '<header class="doc-reader-head">' +
    `<h1>${escapeHtml(heading)}</h1>` +
    `<div class="doc-reader-meta">${escapeHtml(path)}${lineMeta}</div>` +
    "</header>" +
    `<article class="doc-reader-markdown markdown-body">${bodyHtml}</article>`;
  const article = container.querySelector(".doc-reader-markdown");
  await renderMermaidBlocks(article);
  highlightInElement(article, searchTerms(query));
  markMatchBlock(container);
  scrollToAnchor(container);
}
