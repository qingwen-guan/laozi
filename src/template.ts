import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { escapeHtml } from "./text.js";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "web", "templates");
const cache = new Map<string, string>();
let parts: Map<string, string> | null = null;

function loadParts(): Map<string, string> {
  if (parts) return parts;
  parts = new Map();
  const src = readFileSync(join(dir, "parts.html"), "utf8");
  const re = /<template\s+id="([a-z0-9-]+)"\s*>([\s\S]*?)<\/template>/g;
  for (const m of src.matchAll(re)) {
    const name = m[1] ?? "";
    if (parts.has(name)) {
      throw new Error(`parts.html 里 id="${name}" 重复`);
    }
    parts.set(name, (m[2] ?? "").trim());
  }
  return parts;
}

export function loadTemplate(name: string): string {
  const hit = cache.get(name);
  if (hit) return hit;
  const file = join(dir, `${name}.html`);
  const src = existsSync(file) ? readFileSync(file, "utf8") : loadParts().get(name);
  if (src === undefined) {
    throw new Error(`没有模板 ${name}`);
  }
  cache.set(name, src);
  return src;
}

export function fill(template: string, vars: Record<string, string>, name = "template"): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => {
    if (!Object.hasOwn(vars, key)) {
      throw new Error(`模板 ${name} 缺 {{${key}}}`);
    }
    return vars[key] ?? "";
  });
}

export function parseUi(src: string, name: string): { hant: string; hans: string } {
  const lines = src
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 1) {
    const text = escapeHtml(lines[0] ?? "");
    return { hant: text, hans: text };
  }
  if (lines.length !== 2) {
    throw new Error(`模板 ${name} 必须一行（两套相同）或两行（先繁后简）`);
  }
  return { hant: escapeHtml(lines[0] ?? ""), hans: escapeHtml(lines[1] ?? "") };
}

export function uiPair(name: string): { hant: string; hans: string } {
  const id = `ui-${name}`;
  return parseUi(loadTemplate(id), id);
}

export function tpl(name: string, vars: Record<string, string> = {}): string {
  if (name.startsWith("ui-")) {
    throw new Error(`模板 ${name} 是文案对，请用 uiPair`);
  }
  return fill(loadTemplate(name), vars, name);
}
