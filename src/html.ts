import { marked } from "marked";
import { MAP_LABELS, mapIndex, pickScript } from "./book.js";
import { tpl, uiPair } from "./template.js";
import { escapeHtml, formatRange, zhNum } from "./text.js";
import { MAP_ORDER, type Book, type Chapter, type Dir, type JiaokanItem, type Layers, type PdfCombo, type Script, type Theme } from "./types.js";
import { UI_LAYERS } from "../web/js/ui-state.js";

type UiLayer = (typeof UI_LAYERS)[number];

marked.setOptions({ gfm: true, breaks: false });

let activeScript: Script | null = null;

export function withScript<T>(script: Script, fn: () => T): T {
  const prev = activeScript;
  activeScript = script;
  try {
    return fn();
  } finally {
    activeScript = prev;
  }
}

function pair(name: "both" | "both-block", render: (script: Script) => string): string {
  if (activeScript) return render(activeScript);
  return tpl(name, {
    hant: withScript("hant", () => render("hant")),
    hans: withScript("hans", () => render("hans")),
  });
}

function ui(name: string): string {
  const pair = uiPair(name);
  return both((s) => pair[s]);
}

export function both(render: (script: Script) => string): string {
  return pair("both", render);
}

export function bothBlock(render: (script: Script) => string): string {
  return pair("both-block", render);
}

export function renderBaiwen(text: string, chapterId: string, layers: Layers = "full"): string {
  return text
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const escaped = escapeHtml(line);
      const html = layers === "full" ? linkNotes(escaped, chapterId) : plainBaiwen(escaped);
      return tpl("para", { html });
    })
    .join("");
}

function linkNotes(html: string, chapterId: string): string {
  const id = escapeHtml(chapterId);
  return html
    .replaceAll(/〔(\d+)〕/g, (_m, n: string) => tpl("note-ref", { chapterId: id, n }))
    .replaceAll(/〔([^〕]*[^\d〕][^〕]*)〕/g, (_m, text: string) => tpl("supplied", { text }));
}

function plainBaiwen(html: string): string {
  return html
    .replaceAll(/〔\d+〕/g, "")
    .replaceAll(/〔([^〕]*[^\d〕][^〕]*)〕/g, (_m, text: string) => tpl("supplied", { text }));
}

function hasCopy(text: { hant: string; hans: string }): boolean {
  return Boolean(text.hant.trim() || text.hans.trim());
}

function md(text: string): string {
  if (!text.trim()) return "";
  const normalized = text.trim().replace(/([^\n])\n([^\n])/g, "$1\n\n$2");
  return marked.parse(normalized, { async: false });
}

function chapterMapsLine(ch: Chapter, script: Script): string {
  const bits: string[] = [];
  for (const key of MAP_ORDER) {
    for (const range of ch.maps[key]) {
      bits.push(`${MAP_LABELS[key][script]}${formatRange(range.from, range.to)}`);
    }
  }
  return bits.join(" · ");
}

function renderReadings(item: JiaokanItem, witnesses: string[], script: Script): string {
  const items: string[] = [];
  for (const wit of witnesses) {
    if (!Object.hasOwn(item.readings, wit)) continue;
    const val = item.readings[wit];
    const body = val === null ? tpl("missing", { label: ui("missing-label") }) : escapeHtml(pickScript(val, script));
    items.push(tpl("reading", { wit: escapeHtml(wit), body }));
  }
  if (!items.length) return "";
  return tpl("readings", { items: items.join("") });
}

function renderJiaokan(ch: Chapter, witnesses: string[]): string {
  if (!ch.jiaokan.length) return "";
  const zong = ch.jiaokan.find((x) => x.n === null);
  const notes = ch.jiaokan.filter((x) => x.n !== null);
  return (
    (zong
      ? tpl("zongshuo", { reason: bothBlock((s) => md(pickScript(zong.reason, s))) })
      : "") +
    (notes.length
      ? tpl("notes", {
          items: notes
            .map((item) =>
              tpl("note", {
                chapterId: escapeHtml(ch.id),
                n: String(item.n),
                lemma: both((s) => escapeHtml(pickScript(item.lemma, s))),
                readings: bothBlock((s) => renderReadings(item, witnesses, s)),
                choice: item.choice ? tpl("choice", { from: ui("choice-from"), wit: escapeHtml(item.choice) }) : "",
                reason: bothBlock((s) => md(pickScript(item.reason, s))),
              }),
            )
            .join(""),
        })
      : "")
  );
}

function renderMaps(ch: Chapter): string {
  const hant = chapterMapsLine(ch, "hant");
  const hans = chapterMapsLine(ch, "hans");
  if (!hant && !hans) return ui("maps-none");
  return both((s) => escapeHtml(s === "hant" ? hant : hans));
}

function renderChapter(ch: Chapter, book: Book, layers: Layers): string {
  const jiaokan = renderJiaokan(ch, book.witnesses);
  return tpl("chapter", {
    id: escapeHtml(ch.id),
    pian: ch.pian === "道经" ? ui("pian-dao") : ui("pian-de"),
    seq: zhNum(ch.seq),
    title: both((s) => escapeHtml(pickScript(ch.title, s))),
    maps: renderMaps(ch),
    baiwenSection: tpl("layer-baiwen", {
      html: bothBlock((s) => renderBaiwen(pickScript(ch.baiwen, s), ch.id, layers)),
    }),
    jiaokanSection:
      layers === "full" && jiaokan
        ? tpl("layer-jiaokan", { heading: ui("heading-jiaokan"), html: jiaokan })
        : "",
    yiwenSection:
      layers === "full" && hasCopy(ch.yiwen)
        ? tpl("layer-yiwen", {
            heading: ui("heading-yiwen"),
            html: bothBlock((s) => md(pickScript(ch.yiwen, s))),
          })
        : "",
    anyuSection:
      layers === "full" && hasCopy(ch.anyu)
        ? tpl("layer-anyu", {
            heading: ui("heading-anyu"),
            html: bothBlock((s) => md(pickScript(ch.anyu, s))),
          })
        : "",
  });
}

function hasJiaokan(book: Book): boolean {
  return book.chapters.some((ch) => ch.jiaokan.length > 0);
}

function presentBookLayers(book: Book): UiLayer[] {
  const has: Record<UiLayer, boolean> = {
    jiaokan: hasJiaokan(book),
    yiwen: book.chapters.some((ch) => hasCopy(ch.yiwen)),
    anyu: book.chapters.some((ch) => hasCopy(ch.anyu)),
  };
  return UI_LAYERS.filter((key) => has[key]);
}

function attr(name: string, value: string): string {
  return tpl("attr", { name, value });
}

function webHtmlAttrs(book: Book, layers: Layers): string {
  const layerOn = layers === "full" ? "on" : "off";
  const bits = [
    attr("data-title-hant", escapeHtml(book.meta.title.hant)),
    attr("data-title-hans", escapeHtml(book.meta.title.hans)),
  ];
  for (const key of presentBookLayers(book)) {
    bits.push(attr(`data-layer-${key}`, layerOn));
  }
  return bits.join(" ");
}

function webToolbar(book: Book): string {
  const layers = presentBookLayers(book).map((value) =>
    tpl("toolbar-layer", { value, label: ui(`heading-${value}`) }),
  );
  return tpl("toolbar", {
    brand: both((s) => escapeHtml(pickScript(book.meta.title, s))),
    legendScript: ui("legend-script"),
    labelHant: ui("label-hant"),
    labelHans: ui("label-hans"),
    legendDir: ui("legend-dir"),
    labelH: ui("label-h"),
    labelV: ui("label-v"),
    legendTheme: ui("legend-theme"),
    labelModern: ui("label-modern"),
    labelXianzhuang: ui("label-xianzhuang"),
    layerFieldset: layers.length
      ? tpl("toolbar-layers", { legend: ui("legend-layer"), checks: layers.join("") })
      : "",
  });
}

function tocItems(book: Book): string {
  return book.chapters
    .map((ch) =>
      tpl("toc-item", {
        id: escapeHtml(ch.id),
        seq: zhNum(ch.seq),
        title: both((s) => escapeHtml(pickScript(ch.title, s))),
      }),
    )
    .join("");
}

function mapGroups(book: Book): string {
  return mapIndex(book)
    .map((g) => {
      const label = both((s) => escapeHtml(MAP_LABELS[g.key][s]));
      if (!g.rows.length) {
        return tpl("map-empty", { label, text: ui("map-empty-text") });
      }
      return tpl("map-group", {
        label,
        rows: g.rows
          .map((r) =>
            tpl("map-row", {
              source: both((s) => escapeHtml(`${MAP_LABELS[g.key][s]}${formatRange(r.from, r.to)}`)),
              id: escapeHtml(r.chapter.id),
              book: ui("book-word"),
              seq: zhNum(r.chapter.seq),
              title: both((s) => escapeHtml(pickScript(r.chapter.title, s))),
            }),
          )
          .join(""),
      });
    })
    .join("");
}

export function pageShell(opts: {
  book: Book;
  script: Script;
  dir: Dir;
  theme: Theme;
  layers: Layers;
  mode: "web" | "print";
  cssHrefs: string[];
}): string {
  const { book, script, dir, theme, layers, mode, cssHrefs } = opts;
  const title = pickScript(book.meta.title, script);
  const html = () =>
    tpl("page", {
      lang: script === "hant" ? "zh-Hant" : "zh-Hans",
      script,
      dir,
      theme,
      title: escapeHtml(title),
      webAttrs: mode === "web" ? webHtmlAttrs(book, layers) : "",
      css: cssHrefs.map((href) => tpl("css-link", { href })).join("\n"),
      toolbar: mode === "web" ? webToolbar(book) : "",
      bookTitle: both((s) => escapeHtml(pickScript(book.meta.title, s))),
      subtitle: ui("subtitle"),
      tocHeading: ui("toc-heading"),
      mapHeading: ui("map-heading"),
      tocItems: tocItems(book),
      mapGroups: mapGroups(book),
      chapters: book.chapters.map((ch) => renderChapter(ch, book, layers)).join(""),
      boot: mode === "web" ? tpl("boot", { src: "js/app.js" }) : "",
    });
  return mode === "print" ? withScript(script, html) : html();
}

export function pdfFileName({ script, layers, dir, theme }: PdfCombo): string {
  const thick = layers === "full" ? "full" : "text";
  const skin = theme === "xianzhuang" ? "-xianzhuang" : "";
  return `laozi-${script}-${thick}-${dir}${skin}.pdf`;
}

export function parsePdfCombo(name: string): PdfCombo {
  const raw = name.replace(/\.pdf$/, "").replace(/^laozi-/, "");
  const m = raw.match(/^(hant|hans)-(full|text)-(h|v)(-xianzhuang)?$/);
  if (!m) {
    throw new Error(`不能识别的 PDF 组合「${name}」。例：hant-full-v-xianzhuang`);
  }
  const script = m[1] as Script;
  const layers = (m[2] === "full" ? "full" : "text") as Layers;
  const dir = m[3] as Dir;
  const theme: Theme = m[4] ? "xianzhuang" : "modern";
  if (dir === "h" && theme === "xianzhuang") {
    throw new Error("线装只用于竖版");
  }
  return { script, layers, dir, theme };
}

function allLegalPdfs(): PdfCombo[] {
  const out: PdfCombo[] = [];
  for (const script of ["hant", "hans"] as const) {
    for (const layers of ["full", "text"] as const) {
      out.push({ script, layers, dir: "h", theme: "modern" });
      out.push({ script, layers, dir: "v", theme: "modern" });
      out.push({ script, layers, dir: "v", theme: "xianzhuang" });
    }
  }
  return out;
}

export const ALL_PDFS: PdfCombo[] = allLegalPdfs();

export const DEFAULT_PDFS: PdfCombo[] = ALL_PDFS.filter(
  (c) => !(c.layers === "text" && (c.dir === "h" || c.theme === "xianzhuang")),
);

export function resolvePdfCombos(opts: { pdf: boolean; allPdf: boolean; combos: PdfCombo[] }): PdfCombo[] {
  const n = Number(opts.pdf) + Number(opts.allPdf) + Number(opts.combos.length > 0);
  if (n > 1) {
    throw new Error("--pdf、--all-pdf、--combo 只能用一种");
  }
  if (opts.combos.length) return opts.combos;
  if (opts.allPdf) return ALL_PDFS;
  return DEFAULT_PDFS;
}
