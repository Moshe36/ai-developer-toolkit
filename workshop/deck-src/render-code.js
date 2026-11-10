// Renders real file excerpts as editor-style PNGs for the deck, via headless Edge.
// Usage: node render-code.js <spec.json>
// spec: [{ out, width, height, title, tree?: [{ name, depth, active?, dir? }], lines: [{ n, text } | { fold: true }] }]
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const SCALE = 2.5;

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<span class="code">`$1`</span>')
    .replace(/\*\*([^*]+)\*\*/g, '<span class="bold">**$1**</span>');
}

function highlight(lines) {
  let inFence = false;
  let inFront = false;
  return lines.map((l, i) => {
    if (l.fold) return '<div class="row fold"><span class="ln"></span><span class="tx">⋯</span></div>';
    const t = l.text;
    let html;
    if (t.startsWith("```")) { inFence = !inFence; html = `<span class="fence">${esc(t)}</span>`; }
    else if (inFence) html = `<span class="fenced">${esc(t)}</span>`;
    else if (t === "---" && (i === 0 || inFront)) { inFront = !inFront; html = `<span class="fence">${esc(t)}</span>`; }
    else if (inFront) html = esc(t).replace(/^([\w-]+):/, '<span class="key">$1:</span><span class="val">') + "</span>";
    else if (/^#{1,6} /.test(t)) html = `<span class="h">${esc(t)}</span>`;
    else if (/^\s*[-*] /.test(t)) html = t.replace(/^(\s*[-*] )(.*)$/, (m, b, rest) => `<span class="bullet">${esc(b)}</span>${inline(rest)}`);
    else html = inline(t);
    return `<div class="row"><span class="ln">${l.n}</span><span class="tx">${html || "&nbsp;"}</span></div>`;
  }).join("\n");
}

function terminal(lines) {
  const md = (s) => esc(s)
    .replace(/`([^`]+)`/g, '<span class="code">$1</span>')
    .replace(/\*\*([^*]+)\*\*/g, '<span class="bold">$1</span>');
  return lines.map((l) => `<div class="trow ${l.cls || ""}">${l.text ? md(l.text) : "&nbsp;"}</div>`).join("\n");
}

function treeHtml(tree) {
  if (!tree) return "";
  const items = tree.map((f) => `<div class="tf${f.active ? " active" : ""}" style="padding-left:${12 + f.depth * 14}px">${f.dir ? "▾ " : ""}${esc(f.name)}</div>`).join("");
  return `<div class="tree"><div class="tree-h">EXPLORER</div>${items}</div>`;
}

function page(spec) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: ${spec.width}px; height: ${spec.height}px; background: #12302A; overflow: hidden; }
  .win { position: absolute; inset: 0; background: #1B1F1D; border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; font-family: "Cascadia Code", Consolas, monospace; }
  .bar { height: 30px; background: #232826; display: flex; align-items: center; padding: 0 12px; gap: 7px; flex: none; }
  .dot { width: 11px; height: 11px; border-radius: 50%; }
  .title { margin-left: 12px; color: #B9C7BF; font: 13px "Segoe UI", Calibri, sans-serif; }
  .body { flex: 1; display: flex; min-height: 0; }
  .tree { width: 210px; background: #202523; border-right: 1px solid #2C3330; padding-top: 8px; font: 13.5px "Segoe UI", Calibri, sans-serif; color: #AFC0B6; flex: none; }
  .tree-h { font-size: 10.5px; letter-spacing: 1.5px; color: #7E9188; padding: 0 12px 8px; }
  .tf { padding: 3.5px 8px; white-space: nowrap; }
  .tf.active { background: #2E6B57; color: #fff; }
  .code-area { flex: 1; padding: 10px 14px 10px 0; font-size: ${spec.fontSize || 14.5}px; line-height: ${spec.lineHeight || 1.55}; color: #D9E4DD; overflow: hidden; }
  .row { display: flex; }
  .ln { width: 44px; flex: none; text-align: right; padding-right: 14px; color: #5D6E66; }
  .tx { flex: 1; white-space: pre-wrap; word-break: break-word; }
  .fold .tx { color: #6E8279; }
  .h { color: #B9DA78; font-weight: bold; }
  .key { color: #8FC3E8; }
  .val { color: #E6C38F; }
  .fence { color: #6E8279; }
  .fenced { color: #A9C9B8; }
  .bullet { color: #B9DA78; }
  .code { color: #E6A86A; }
  .bold { color: #FFFFFF; font-weight: bold; }
  .trow { white-space: pre-wrap; word-break: break-word; padding-left: 16px; }
  .trow.cmd { color: #FFFFFF; }
  .trow.meta { color: #6E8279; }
  .trow.tool { color: #B9DA78; font-weight: bold; }
  .trow.note { color: #9FB2A8; }
  </style></head><body><div class="win">
  <div class="bar"><span class="dot" style="background:#E5675F"></span><span class="dot" style="background:#E5B84F"></span><span class="dot" style="background:#6CC069"></span><span class="title">${esc(spec.title)}</span></div>
  <div class="body">${treeHtml(spec.tree)}<div class="code-area">${spec.terminal ? terminal(spec.terminal) : highlight(spec.lines)}</div></div>
  </div></body></html>`;
}

const specs = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const tmp = path.join(process.env.TEMP, "opencode", "render-code");
fs.mkdirSync(tmp, { recursive: true });
for (const spec of specs) {
  const html = path.join(tmp, path.basename(spec.out, ".png") + ".html");
  fs.writeFileSync(html, page(spec));
  execFileSync(EDGE, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--force-device-scale-factor=${SCALE}`, `--window-size=${spec.width},${spec.height}`, `--screenshot=${path.resolve(spec.out)}`, "file:///" + html.replace(/\\/g, "/")], { stdio: "ignore" });
  console.log("Wrote " + spec.out);
}
