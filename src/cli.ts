import { cpSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { loadBook } from "./book.js";
import { copyFonts } from "./fonts.js";
import { pageShell, parsePdfCombo, pdfFileName, resolvePdfCombos } from "./html.js";
import { SyntaxErrorWithHint } from "./parse.js";
import { serveStatic } from "./serve.js";
import { SchemaError, type Book, type PdfCombo } from "./types.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultSource = join(root, "laozi.yaml");
const cssSrc = join(root, "web", "css");

function usage(): string {
  return `用法:
  npx tsx src/cli.ts validate [laozi.yaml]
  npx tsx src/cli.ts build [--web] [--pdf] [--all-pdf] [--combo hant-full-v] [--file laozi.yaml]
  npx tsx src/cli.ts serve [--host 0.0.0.0] [--port 8765] [--file laozi.yaml]
`;
}

function fail(err: unknown): never {
  if (err instanceof SyntaxErrorWithHint || err instanceof SchemaError) {
    console.error(err.message);
    process.exit(1);
  }
  throw err;
}

function copyCss(destDir: string, files: string[]): void {
  mkdirSync(destDir, { recursive: true });
  for (const file of files) {
    cpSync(join(cssSrc, file), join(destDir, file));
  }
}

function copyAssets(destRoot: string, cssFiles: string[]): void {
  copyCss(join(destRoot, "css"), cssFiles);
  copyFonts(join(destRoot, "fonts"));
}

function copyJs(destDir: string): void {
  const srcDir = join(root, "web", "js");
  mkdirSync(destDir, { recursive: true });
  for (const file of readdirSync(srcDir).filter((name) => name.endsWith(".js"))) {
    cpSync(join(srcDir, file), join(destDir, file));
  }
}

export function buildWeb(book: Book): string {
  const dest = join(root, "dist", "web");
  const cssFiles = ["fonts.css", "book.css", "writing.css", "themes.css", "app.css"];
  copyAssets(dest, cssFiles);
  copyJs(join(dest, "js"));
  const html = pageShell({
    book,
    script: "hant",
    dir: "h",
    theme: "modern",
    layers: "full",
    mode: "web",
    cssHrefs: cssFiles.map((f) => `css/${f}`),
  });
  writeFileSync(join(dest, "index.html"), html);
  return join(dest, "index.html");
}

function buildPrintHtml(book: Book, combo: PdfCombo, dest: string, cssFiles: string[]): string {
  const base = pdfFileName(combo).replace(/\.pdf$/, "");
  const html = pageShell({
    book,
    script: combo.script,
    dir: combo.dir,
    theme: combo.theme,
    layers: combo.layers,
    mode: "print",
    cssHrefs: cssFiles.map((f) => `css/${f}`),
  });
  const out = join(dest, `${base}.html`);
  writeFileSync(out, html);
  return out;
}

function buildPdf(book: Book, combos: PdfCombo[]): string[] {
  const dest = join(root, "dist", "print");
  const cssFiles = ["fonts.css", "book.css", "writing.css", "themes.css", "print.css"];
  copyAssets(dest, cssFiles);
  const pdfDir = join(root, "dist", "pdf");
  mkdirSync(pdfDir, { recursive: true });
  const cli = join(root, "node_modules", "@vivliostyle", "cli", "dist", "cli.js");
  const results: string[] = [];
  for (const combo of combos) {
    const htmlPath = buildPrintHtml(book, combo, dest, cssFiles);
    const out = join(pdfDir, pdfFileName(combo));
    const run = spawnSync(process.execPath, [cli, "build", htmlPath, "-o", out], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (run.status !== 0) {
      const detail = (run.stderr || run.stdout || "").trim();
      throw new Error(`Vivliostyle 未能写出 ${pdfFileName(combo)}\n${detail}`);
    }
    results.push(out);
  }
  return results;
}

function parseArgs(argv: string[]) {
  const args = {
    cmd: argv[2],
    file: defaultSource,
    web: false,
    pdf: false,
    allPdf: false,
    combos: [] as PdfCombo[],
    host: "0.0.0.0",
    port: 8765,
  };
  const rest = argv.slice(3);
  for (let i = 0; i < rest.length; i++) {
    const token = rest[i];
    if (token === "--file") {
      const next = rest[++i];
      if (!next) {
        console.error(`--file 后面需要路径\n${usage()}`);
        process.exit(2);
      }
      args.file = resolve(next);
    } else if (token === "--host") {
      const next = rest[++i];
      if (!next) {
        console.error(`--host 后面需要地址\n${usage()}`);
        process.exit(2);
      }
      args.host = next;
    } else if (token === "--port") {
      const next = rest[++i];
      const port = Number(next);
      if (!next || !Number.isInteger(port) || port <= 0) {
        console.error(`--port 后面需要正整数\n${usage()}`);
        process.exit(2);
      }
      args.port = port;
    } else if (token === "--combo") {
      const next = rest[++i];
      if (!next) {
        console.error(`--combo 后面需要组合名，如 hant-full-v-xianzhuang\n${usage()}`);
        process.exit(2);
      }
      try {
        args.combos.push(parsePdfCombo(next));
      } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        process.exit(2);
      }
    } else if (token === "--web") args.web = true;
    else if (token === "--pdf") args.pdf = true;
    else if (token === "--all-pdf") args.allPdf = true;
    else if (token && !token.startsWith("-") && args.cmd === "validate") args.file = resolve(token);
    else {
      console.error(`未知参数 ${token}\n${usage()}`);
      process.exit(2);
    }
  }
  return args;
}

function main(): void {
  const args = parseArgs(process.argv);
  if (args.cmd !== "validate" && args.cmd !== "build" && args.cmd !== "serve") {
    console.error(usage());
    process.exit(2);
  }

  let book: Book;
  try {
    book = loadBook(args.file);
  } catch (err) {
    fail(err);
  }

  if (args.cmd === "validate") {
    console.log(`校验通过：${book.chapters.length} 章`);
    return;
  }

  if (args.cmd === "serve") {
    const path = buildWeb(book);
    console.log(`网页：${path}`);
    serveStatic(join(root, "dist", "web"), args.host, args.port);
    return;
  }

  const askedPdf = args.pdf || args.allPdf || args.combos.length > 0;
  const doWeb = args.web || (!args.web && !askedPdf);
  const doPdf = askedPdf || (!args.web && !askedPdf);

  if (doWeb) {
    const path = buildWeb(book);
    console.log(`网页：${path}`);
  }
  if (doPdf) {
    let combos;
    try {
      combos = resolvePdfCombos({ pdf: args.pdf, allPdf: args.allPdf, combos: args.combos });
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(2);
    }
    try {
      const paths = buildPdf(book, combos);
      for (const p of paths) console.log(`PDF：${p}`);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  }
}

main();
