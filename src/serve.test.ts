import assert from "node:assert/strict";
import { test } from "node:test";
import { requestPath } from "./serve.js";

test("requestPath 解码路径，残缺百分号返回 null", () => {
  assert.equal(requestPath("/css/book.css"), "/css/book.css");
  assert.equal(requestPath("/foo%20bar?x=1"), "/foo bar");
  assert.equal(requestPath("%"), null);
});
