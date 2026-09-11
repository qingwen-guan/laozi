import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyToolbarChange,
  flag,
  layerDatasetProp,
  parseStoredUi,
  pick,
  readUiState,
  UI_DEFAULTS,
  UI_LAYERS,
  UI_SCRIPTS,
} from "../web/js/ui-state.js";

test("pick 只收白名单，否则回退", () => {
  assert.equal(pick("hans", UI_SCRIPTS, "hant"), "hans");
  assert.equal(pick("nope", UI_SCRIPTS, "hant"), "hant");
  assert.equal(pick(1, UI_SCRIPTS, "hant"), "hant");
});

test("flag 认 1/0、true/false 与布尔，其余回退", () => {
  assert.equal(flag(true, false), true);
  assert.equal(flag("1", false), true);
  assert.equal(flag("true", false), true);
  assert.equal(flag(false, true), false);
  assert.equal(flag("0", true), false);
  assert.equal(flag("false", true), false);
  assert.equal(flag("", false), false);
  assert.equal(flag("nope", true), true);
});

test("parseStoredUi 拒坏 JSON 和非对象", () => {
  assert.deepEqual(parseStoredUi(null), {});
  assert.deepEqual(parseStoredUi("{"), {});
  assert.deepEqual(parseStoredUi("[1]"), {});
  assert.deepEqual(parseStoredUi('{"script":"hans"}'), { script: "hans" });
});

test("查询与存储用同一套 flag，横排可留线装", () => {
  assert.equal(readUiState(new URLSearchParams("jiaokan=false"), {}).jiaokan, false);
  const q = new URLSearchParams("script=nope&jiaokan=0&dir=h&theme=xianzhuang");
  const state = readUiState(q, { script: "hans", yiwen: false, theme: "xianzhuang" });
  assert.deepEqual(state, {
    ...UI_DEFAULTS,
    script: "hans",
    dir: "h",
    theme: "xianzhuang",
    jiaokan: false,
    yiwen: false,
  });
});

test("存储里的 false 也能关层", () => {
  const q = new URLSearchParams();
  const state = readUiState(q, { anyu: false });
  assert.equal(state.anyu, false);
});

test("层属性名从 UI_LAYERS 推导", () => {
  assert.deepEqual(
    UI_LAYERS.map((key) => layerDatasetProp(key)),
    ["layerJiaokan", "layerYiwen", "layerAnyu"],
  );
});

test("工具栏改动：脏值忽略，换方向不改外观", () => {
  const start = { ...UI_DEFAULTS, script: "hans" as const, dir: "v" as const, theme: "xianzhuang" as const };
  assert.equal(applyToolbarChange(start, "script", "nope", true).script, "hans");
  const across = applyToolbarChange(start, "dir", "h", true);
  assert.equal(across.dir, "h");
  assert.equal(across.theme, "xianzhuang");
  assert.equal(applyToolbarChange(start, "layer", "jiaokan", false).jiaokan, false);
  assert.equal(applyToolbarChange(start, "layer", "nope", false).jiaokan, true);
});
