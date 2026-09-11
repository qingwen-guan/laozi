import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeBook } from "./book.js";
import {
  ALL_PDFS,
  DEFAULT_PDFS,
  pageShell,
  parsePdfCombo,
  pdfFileName,
  renderBaiwen,
  resolvePdfCombos,
} from "./html.js";

const sampleWenda = [
  {
    q: { hant: "為什麼叫私校本", hans: "为什么叫私校本" },
    a: { hant: "因為這是未刊稿。", hans: "因为这是未刊稿。" },
  },
];

const book = normalizeBook({
  meta: { title: "老子", wenda: sampleWenda },
  witnesses: ["王弼", "帛甲"],
  chapters: [
    {
      id: "de-01",
      seq: 1,
      pian: "德经",
      title: "上德不德",
      maps: {
        received: [{ from: 38, to: 38 }],
        mawangdui: [{ from: 1, to: 1 }],
        beida: [{ from: 1, to: 1 }],
        guodian: [],
      },
      baiwen: "上德不德〔1〕，〔德〕成。",
      jiaokan: [
        {
          n: 1,
          lemma: "上德不德",
          readings: { 王弼: "上德不德", 帛甲: null },
          choice: "王弼",
          reason: "今从王弼。",
        },
      ],
      yiwen: "最高的德。",
      anyu: "按。",
    },
  ],
});

test("详本白文注号做成链接，精简本去掉注号并保留补字", () => {
  const full = renderBaiwen("上德不德〔1〕，〔德〕成。", "de-01", "full");
  assert.match(full, /href="#jk-de-01-1"/);
  assert.match(full, /class="supplied"/);
  const text = renderBaiwen("上德不德〔1〕，〔德〕成。", "de-01", "text");
  assert.doesNotMatch(text, /note-ref/);
  assert.doesNotMatch(text, /〔1〕/);
  assert.match(text, /class="supplied"/);
  assert.match(text, /上德不德，/);
});

test("印刷精简本不生成校记今译按语", () => {
  const html = pageShell({
    book,
    script: "hant",
    dir: "v",
    theme: "modern",
    layers: "text",
    mode: "print",
    cssHrefs: ["css/book.css"],
  });
  assert.doesNotMatch(html, /class="layer layer-jiaokan"/);
  assert.doesNotMatch(html, /class="layer layer-yiwen"/);
  assert.doesNotMatch(html, /class="layer layer-anyu"/);
  assert.match(html, /class="layer layer-baiwen"/);
  assert.match(html, /class="wenda"/);
  assert.match(html, /未刊稿/);
});

test("印刷只出一套用字，网页保留两套", () => {
  const print = pageShell({
    book,
    script: "hant",
    dir: "v",
    theme: "xianzhuang",
    layers: "full",
    mode: "print",
    cssHrefs: ["css/book.css"],
  });
  assert.doesNotMatch(print, /script-hans/);
  assert.doesNotMatch(print, /德经在前/);
  assert.doesNotMatch(print, /本书/);
  assert.match(print, /class="wenda"/);
  assert.match(print, /私校本 · 德經在前/);
  assert.match(print, /本書/);
  const web = pageShell({
    book,
    script: "hant",
    dir: "h",
    theme: "modern",
    layers: "full",
    mode: "web",
    cssHrefs: ["css/book.css"],
  });
  assert.match(web, /script-hant/);
  assert.match(web, /script-hans/);
  assert.equal([...web.matchAll(/class="map-group"/g)].length, 4);
});

test("书后问答网页与印刷都出", () => {
  const web = pageShell({
    book,
    script: "hant",
    dir: "h",
    theme: "modern",
    layers: "full",
    mode: "web",
    cssHrefs: ["css/book.css"],
  });
  assert.match(web, /class="wenda"/);
  assert.match(web, /href="#wenda"/);
  assert.match(web, /為什麼叫私校本/);
  assert.match(web, /因为这是未刊稿/);
  const print = pageShell({
    book,
    script: "hant",
    dir: "v",
    theme: "modern",
    layers: "full",
    mode: "print",
    cssHrefs: ["css/book.css"],
  });
  assert.match(print, /class="wenda"/);
  assert.match(print, /為什麼叫私校本/);
  assert.match(print, /因為這是未刊稿/);
  assert.doesNotMatch(print, /因为这是未刊稿/);
});

test("网页写出两套书题供页签与工具栏共用", () => {
  const titled = { ...book, meta: { ...book.meta, title: { hant: "老子", hans: "老子简" } } };
  const html = pageShell({
    book: titled,
    script: "hant",
    dir: "h",
    theme: "modern",
    layers: "full",
    mode: "web",
    cssHrefs: ["css/book.css"],
  });
  assert.match(html, /data-title-hant="老子"/);
  assert.match(html, /data-title-hans="老子简"/);
  assert.match(html, /<title>老子<\/title>/);
  assert.match(html, /class="toolbar-brand"[\s\S]*class="script-hant">老子</);
  assert.match(html, /class="toolbar-brand"[\s\S]*class="script-hans">老子简</);
  assert.match(html, /data-layer-jiaokan="on"/);
  assert.match(html, /data-layer-yiwen="on"/);
  assert.match(html, /data-layer-anyu="on"/);
});

test("详本空层不输出空壳", () => {
  const empty = normalizeBook({
    meta: { title: "老子", wenda: sampleWenda },
    witnesses: ["王弼"],
    chapters: [
      {
        id: "de-01",
        seq: 1,
        pian: "德经",
        title: "上德不德",
        maps: { received: [], mawangdui: [], beida: [], guodian: [] },
        baiwen: "上德不德。",
        jiaokan: [],
        yiwen: "",
        anyu: "",
      },
    ],
  });
  const html = pageShell({
    book: empty,
    script: "hant",
    dir: "h",
    theme: "modern",
    layers: "full",
    mode: "web",
    cssHrefs: ["css/book.css"],
  });
  assert.doesNotMatch(html, /class="layer layer-jiaokan"/);
  assert.doesNotMatch(html, /class="layer layer-yiwen"/);
  assert.doesNotMatch(html, /class="layer layer-anyu"/);
  assert.doesNotMatch(html, /name="layer"/);
  assert.doesNotMatch(html, /data-layer-/);
});

test("印刷页不带网页用的 data-title 与 data-layer", () => {
  const html = pageShell({
    book,
    script: "hant",
    dir: "v",
    theme: "modern",
    layers: "full",
    mode: "print",
    cssHrefs: ["css/book.css"],
  });
  assert.doesNotMatch(html, /data-title-hant/);
  assert.doesNotMatch(html, /data-layer-jiaokan/);
});

test("合法 PDF 组合十二种，默认从全表筛", () => {
  assert.equal(ALL_PDFS.length, 12);
  assert.equal(DEFAULT_PDFS.length, 8);
  assert.ok(DEFAULT_PDFS.every((c) => ALL_PDFS.some((a) => pdfFileName(a) === pdfFileName(c))));
  assert.ok(ALL_PDFS.every((c) => !(c.dir === "h" && c.theme === "xianzhuang")));
});

test("PDF 开关互斥", () => {
  assert.equal(resolvePdfCombos({ pdf: false, allPdf: false, combos: [] }).length, 8);
  assert.equal(resolvePdfCombos({ pdf: false, allPdf: true, combos: [] }).length, 12);
  assert.throws(() => resolvePdfCombos({ pdf: true, allPdf: true, combos: [] }), /只能用一种/);
  assert.throws(
    () =>
      resolvePdfCombos({
        pdf: true,
        allPdf: false,
        combos: [parsePdfCombo("hant-full-v")],
      }),
    /只能用一种/,
  );
});

test("parsePdfCombo 认文件名，拒横版线装", () => {
  assert.deepEqual(parsePdfCombo("laozi-hant-full-v-xianzhuang.pdf"), {
    script: "hant",
    layers: "full",
    dir: "v",
    theme: "xianzhuang",
  });
  assert.equal(pdfFileName(parsePdfCombo("hans-text-h")), "laozi-hans-text-h.pdf");
  assert.throws(() => parsePdfCombo("hant-full-h-xianzhuang"), /线装只用于竖版/);
  assert.throws(() => parsePdfCombo("nope"), /不能识别/);
});
