import type { Bilingual, ResolveTextOptions } from "./types.js";

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function resolveText(
  value: unknown,
  path: string,
  errors: string[],
  options: ResolveTextOptions = {},
): Bilingual {
  const allowEmpty = options.allowEmpty ?? true;

  if (value === null || value === undefined) {
    errors.push(`${path}：不能为空`);
    return { hant: "", hans: "" };
  }

  if (typeof value === "string") {
    if (!allowEmpty && value.trim() === "") {
      errors.push(`${path}：不能为空`);
    }
    return { hant: value, hans: value };
  }

  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    const extra = keys.filter((k) => k !== "hant" && k !== "hans");
    if (extra.length) {
      errors.push(`${path}：文本对象只能有 hant / hans，多了 ${extra.map(quote).join("、")}`);
    }
    if (!Object.hasOwn(value, "hant") || !Object.hasOwn(value, "hans")) {
      const missing = ["hant", "hans"].filter((k) => !Object.hasOwn(value, k));
      errors.push(`${path}：文本对象必须同时有 hant 与 hans，缺 ${missing.join("、")}`);
    }
    if (typeof value.hant !== "string" && Object.hasOwn(value, "hant")) {
      errors.push(`${path}.hant：必须是字符串`);
    }
    if (typeof value.hans !== "string" && Object.hasOwn(value, "hans")) {
      errors.push(`${path}.hans：必须是字符串`);
    }
    const hant = typeof value.hant === "string" ? value.hant : "";
    const hans = typeof value.hans === "string" ? value.hans : "";
    if (!allowEmpty && hant.trim() === "" && hans.trim() === "") {
      errors.push(`${path}：不能为空`);
    }
    return { hant, hans };
  }

  errors.push(`${path}：必须是字符串，或恰好含 hant / hans 的对象`);
  return { hant: "", hans: "" };
}

export function extractNoteNumbers(text: string): number[] {
  const nums: number[] = [];
  const re = /〔(\d+)〕/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    nums.push(Number(m[1]));
  }
  return nums;
}

export function quote(s: string): string {
  return `「${s}」`;
}

const DIGITS = "零一二三四五六七八九";

export function zhNum(n: number): string {
  if (!Number.isInteger(n) || n < 0) return String(n);
  if (n < 10) return DIGITS[n] ?? String(n);
  if (n === 10) return "十";
  if (n < 20) return `十${DIGITS[n % 10]}`;
  if (n < 100) {
    const ones = n % 10;
    return `${DIGITS[Math.floor(n / 10)]}十${ones ? DIGITS[ones] : ""}`;
  }
  if (n < 1000) {
    const rest = n % 100;
    const head = `${DIGITS[Math.floor(n / 100)]}百`;
    if (rest === 0) return head;
    if (rest < 10) return `${head}零${DIGITS[rest]}`;
    if (rest < 20) return `${head}一${zhNum(rest)}`;
    return `${head}${zhNum(rest)}`;
  }
  if (n < 10000) {
    const rest = n % 1000;
    const head = `${DIGITS[Math.floor(n / 1000)]}千`;
    if (rest === 0) return head;
    if (rest < 10) return `${head}零${DIGITS[rest]}`;
    if (rest < 20) return `${head}零一${zhNum(rest)}`;
    if (rest < 100) return `${head}零${zhNum(rest)}`;
    return `${head}${zhNum(rest)}`;
  }
  return String(n);
}

export function formatRange(from: number, to: number): string {
  if (from === to) return `第${zhNum(from)}章`;
  return `第${zhNum(from)}–${zhNum(to)}章`;
}

export function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
