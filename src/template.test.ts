import assert from "node:assert/strict";
import { test } from "node:test";
import { both, bothBlock } from "./html.js";
import { fill, parseUi, tpl, uiPair } from "./template.js";

test("缺变量时报模板名和键", () => {
  assert.throws(() => fill("{{a}}{{b}}", { a: "1" }, "demo"), /模板 demo 缺 \{\{b\}\}/);
});

test("繁简成对走模板", () => {
  const inline = both((s) => (s === "hant" ? "繁" : "简"));
  assert.match(inline, /class="script-hant">繁/);
  assert.match(inline, /class="script-hans">简/);
  const block = bothBlock((s) => `<p>${s}</p>`);
  assert.match(block, /<div class="script-hant"><p>hant<\/p><\/div>/);
});

test("parts 里的小块也能填", () => {
  assert.match(tpl("note-ref", { chapterId: "de-01", n: "2" }), /href="#jk-de-01-2"/);
  assert.match(tpl("toolbar-layer", { value: "jiaokan", label: "校记" }), /value="jiaokan"/);
});

test("文案对不能当 markup 填", () => {
  assert.throws(() => tpl("ui-subtitle"), /文案对，请用 uiPair/);
});

test("parseUi 转义；一行同形，两行先繁后简", () => {
  assert.deepEqual(parseUi("用字", "demo"), { hant: "用字", hans: "用字" });
  assert.deepEqual(parseUi("甲 & 乙\n甲 < 乙", "demo"), {
    hant: "甲 &amp; 乙",
    hans: "甲 &lt; 乙",
  });
  assert.throws(() => parseUi("", "demo"), /必须一行/);
  assert.throws(() => parseUi("甲\n乙\n丙", "demo"), /必须一行/);
});

test("uiPair 读 ui- 文案对", () => {
  const pair = uiPair("legend-script");
  assert.deepEqual(pair, { hant: "用字", hans: "用字" });
});

test("章模板能填完", () => {
  const html = tpl("chapter", {
    id: "de-01",
    pian: "德经",
    seq: "一",
    title: "上德不德",
    maps: "通行本第三十八章",
    baiwenSection: "<p>上德不德</p>",
    jiaokanSection: "",
    yiwenSection: "",
    anyuSection: "",
  });
  assert.match(html, /id="de-01"/);
  assert.match(html, /上德不德/);
});
