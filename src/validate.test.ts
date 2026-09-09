import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeBook } from "./book.js";
import { lastChapterHint, parseYamlSource, SyntaxErrorWithHint } from "./parse.js";
import { validateBook } from "./validate.js";

function sampleChapter(over: Record<string, unknown> = {}) {
  return {
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
    baiwen: "上德不德〔1〕，是以有德。",
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
    ...over,
  };
}

function sampleBook(over: Record<string, unknown> = {}) {
  return {
    meta: { title: "老子" },
    witnesses: ["王弼", "帛甲", "帛乙", "北大", "郭店"],
    chapters: [sampleChapter()],
    ...over,
  };
}

test("合格样书无错", () => {
  assert.deepEqual(validateBook(sampleBook()), []);
});

test("顶层未知键", () => {
  const errors = validateBook({ ...sampleBook(), extra: 1 });
  assert.match(errors[0] ?? "", /顶层多了未知键「extra」/);
});

test("未登记的本子名报到章与键", () => {
  const ch = sampleChapter({
    jiaokan: [
      {
        n: 1,
        lemma: "上德不德",
        readings: { 傅奕: "上德不德" },
        choice: "傅奕",
        reason: "x",
      },
    ],
  });
  const errors = validateBook(sampleBook({ chapters: [ch] }));
  assert.ok(errors.some((e) => e.includes("第 1 章（id=de-01）jiaokan[0].readings：未登记的本子名「傅奕」")));
  assert.ok(errors.some((e) => e.includes("jiaokan[0].choice：未登记的本子名「傅奕」")));
});

test("繁简注号不一致", () => {
  const ch = sampleChapter({
    baiwen: { hant: "甲〔1〕乙〔2〕", hans: "甲〔1〕乙〔3〕" },
    jiaokan: [
      { n: 1, lemma: "甲", readings: { 王弼: "甲" }, choice: "王弼", reason: "a" },
      { n: 2, lemma: "乙", readings: { 王弼: "乙" }, choice: "王弼", reason: "b" },
    ],
  });
  const errors = validateBook(sampleBook({ chapters: [ch] }));
  assert.ok(errors.some((e) => e.includes("简体注号为 1,3，繁体为 1,2")));
});

test("章 id 只能是小写字母数字与连字符", () => {
  const errors = validateBook(sampleBook({ chapters: [sampleChapter({ id: "德-01" })] }));
  assert.ok(errors.some((e) => e.includes("id：只能是小写字母、数字与连字符")));
});

test("seq 必须与列表位置一致", () => {
  const ch = sampleChapter({ seq: 2 });
  const errors = validateBook(sampleBook({ chapters: [ch] }));
  assert.ok(errors.some((e) => e.includes("seq：必须是 1")));
});

test("总说超过一条", () => {
  const ch = sampleChapter({
    jiaokan: [
      { n: 1, lemma: "上德不德", readings: { 王弼: "上德不德" }, choice: "王弼", reason: "a" },
      { n: null, lemma: "", readings: {}, choice: null, reason: "总说一" },
      { n: null, lemma: "", readings: {}, choice: null, reason: "总说二" },
    ],
  });
  const errors = validateBook(sampleBook({ chapters: [ch] }));
  assert.ok(errors.some((e) => e.includes("总说（n 为 null）最多一条")));
});

test("补字不计入注号", () => {
  const ch = sampleChapter({
    baiwen: "上德〔德〕不德〔1〕",
  });
  assert.deepEqual(validateBook(sampleBook({ chapters: [ch] })), []);
});

test("同形文本规范化为 hant/hans", () => {
  const book = normalizeBook(sampleBook());
  assert.equal(book.chapters[0]?.title.hant, "上德不德");
  assert.equal(book.chapters[0]?.title.hans, "上德不德");
});

test("语法错误带上行号与上一章 id", () => {
  const src = [
    "meta:",
    "  title: 老子",
    "witnesses: [王弼]",
    "chapters:",
    "  - id: de-01",
    "    seq: 1",
    "    pian: 德经",
    "  - id: de-02",
    "   seq: 2",
    "",
  ].join("\n");
  assert.throws(
    () => parseYamlSource(src, "laozi.yaml"),
    (err: unknown) => {
      assert.ok(err instanceof SyntaxErrorWithHint);
      assert.match(err.message, /laozi.yaml:\d+:\d+ 语法错误/);
      assert.match(err.message, /上一章已读到 id=de-02/);
      return true;
    },
  );
});

test("lastChapterHint 扫到最后一个 id", () => {
  const src = "chapters:\n  - id: de-07\n    seq: 7\n    title: x\n";
  assert.equal(lastChapterHint(src, 4), "上一章已读到 id=de-07（seq 7）");
});
