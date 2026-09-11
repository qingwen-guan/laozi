/**
 * @param {{ children: Iterable<unknown> }} book
 * @returns {unknown[]}
 */
export function bookSlides(book) {
  return [...book.children];
}

/**
 * @param {{ contains(node: unknown): boolean }[]} slides
 * @param {unknown} target
 * @returns {number}
 */
export function slideIndexContaining(slides, target) {
  if (!target) return -1;
  return slides.findIndex((s) => s.contains(target));
}

/**
 * @param {number} i
 * @param {number} n
 * @returns {number}
 */
export function clampSlide(i, n) {
  if (n <= 0) return 0;
  return Math.max(0, Math.min(i, n - 1));
}

/**
 * 刚进入竖排或地址栏变了才跟 hash；工具栏改层保持当前幅。
 * @param {number} current
 * @param {number} n
 * @param {number} hashIndex
 * @param {boolean} followHash
 * @returns {number}
 */
export function pickSlideIndex(current, n, hashIndex, followHash) {
  if (followHash && hashIndex >= 0) return clampSlide(hashIndex, n);
  return clampSlide(current, n);
}
