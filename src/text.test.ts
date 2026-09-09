import assert from "node:assert/strict";
import { test } from "node:test";
import { zhNum } from "./text.js";

test("zhNum 百以上仍用汉字", () => {
  assert.equal(zhNum(10), "十");
  assert.equal(zhNum(18), "十八");
  assert.equal(zhNum(20), "二十");
  assert.equal(zhNum(100), "一百");
  assert.equal(zhNum(101), "一百零一");
  assert.equal(zhNum(110), "一百一十");
  assert.equal(zhNum(111), "一百一十一");
  assert.equal(zhNum(120), "一百二十");
  assert.equal(zhNum(200), "二百");
  assert.equal(zhNum(1000), "一千");
  assert.equal(zhNum(1010), "一千零一十");
});
