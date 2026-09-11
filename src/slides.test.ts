import assert from "node:assert/strict";
import { test } from "node:test";
import { bookSlides, clampSlide, pickSlideIndex, slideIndexContaining } from "../web/js/slides.js";

test("竖排幅从 .book 的直接子节来", () => {
  const a = { contains: (n: unknown) => n === "in-a" };
  const b = { contains: (n: unknown) => n === "in-b" };
  const slides = bookSlides({ children: [a, b] });
  assert.deepEqual(slides, [a, b]);
  assert.equal(slideIndexContaining(slides, "in-b"), 1);
  assert.equal(slideIndexContaining(slides, "nope"), -1);
  assert.equal(slideIndexContaining(slides, null), -1);
});

test("幅序号夹在范围内", () => {
  assert.equal(clampSlide(2, 3), 2);
  assert.equal(clampSlide(-1, 3), 0);
  assert.equal(clampSlide(9, 3), 2);
  assert.equal(clampSlide(1, 0), 0);
});

test("只有跟 hash 时才用锚点幅", () => {
  assert.equal(pickSlideIndex(3, 5, 1, true), 1);
  assert.equal(pickSlideIndex(3, 5, 1, false), 3);
  assert.equal(pickSlideIndex(3, 5, -1, true), 3);
  assert.equal(pickSlideIndex(9, 5, -1, false), 4);
});
