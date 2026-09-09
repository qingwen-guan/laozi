import { extractNoteNumbers, isPlainObject, quote, resolveText } from "./text.js";
import { MAP_ORDER, PIANS, type Bilingual, type MapKey } from "./types.js";

const TOP_KEYS = new Set(["meta", "witnesses", "chapters"]);
const META_KEYS = new Set(["title"]);
const CHAPTER_KEYS = new Set(["id", "seq", "pian", "title", "maps", "baiwen", "jiaokan", "yiwen", "anyu"]);
const JIAOKAN_KEYS = new Set(["n", "lemma", "readings", "choice", "reason"]);

export function validateBook(data: unknown): string[] {
  const errors: string[] = [];
  if (!isPlainObject(data)) {
    return ["根节点必须是对象，且只含 meta、witnesses、chapters"];
  }

  const extraTop = Object.keys(data).filter((k) => !TOP_KEYS.has(k));
  if (extraTop.length) {
    errors.push(`顶层多了未知键${extraTop.map(quote).join("、")}`);
  }
  for (const k of TOP_KEYS) {
    if (!Object.hasOwn(data, k)) errors.push(`缺顶层键 ${k}`);
  }

  if (!isPlainObject(data.meta)) {
    errors.push("meta：必须是对象");
  } else {
    const extraMeta = Object.keys(data.meta).filter((k) => !META_KEYS.has(k));
    if (extraMeta.length) {
      errors.push(`meta 多了未知键${extraMeta.map(quote).join("、")}`);
    }
    if (!Object.hasOwn(data.meta, "title")) {
      errors.push("meta.title：缺");
    } else {
      resolveText(data.meta.title, "meta.title", errors, { allowEmpty: false });
    }
  }

  const witnessSet = validateWitnesses(data.witnesses, errors);

  if (!Array.isArray(data.chapters)) {
    errors.push("chapters：必须是列表");
    return errors;
  }
  if (data.chapters.length === 0) {
    errors.push("chapters：至少要有一章");
  }

  const seenIds = new Map<string, number>();
  data.chapters.forEach((ch, i) => {
    validateChapter(ch, i, witnessSet, seenIds, errors);
  });

  return errors;
}

function validateWitnesses(list: unknown, errors: string[]): Set<string> {
  const set = new Set<string>();
  if (!Array.isArray(list) || list.length === 0) {
    errors.push("witnesses：必须是非空字符串列表");
    return set;
  }
  list.forEach((name, i) => {
    if (typeof name !== "string" || name.trim() === "") {
      errors.push(`witnesses[${i}]：必须是非空字符串`);
      return;
    }
    if (set.has(name)) {
      errors.push(`witnesses[${i}]：本子名 ${quote(name)} 重复`);
    }
    set.add(name);
  });
  return set;
}

function chapterLabel(ch: unknown, i: number): string {
  const n = i + 1;
  if (isPlainObject(ch) && typeof ch.id === "string" && ch.id.trim()) {
    return `第 ${n} 章（id=${ch.id}）`;
  }
  return `第 ${n} 章（列表第 ${n} 项）`;
}

function validateChapter(
  ch: unknown,
  i: number,
  witnessSet: Set<string>,
  seenIds: Map<string, number>,
  errors: string[],
): void {
  const label = chapterLabel(ch, i);
  const p = (key: string) => `${label}${key}`;

  if (!isPlainObject(ch)) {
    errors.push(`${label}：必须是对象`);
    return;
  }

  const extra = Object.keys(ch).filter((k) => !CHAPTER_KEYS.has(k));
  if (extra.length) {
    errors.push(`${label}多了未知键${extra.map(quote).join("、")}`);
  }
  for (const k of CHAPTER_KEYS) {
    if (!Object.hasOwn(ch, k)) errors.push(`${p(k)}：缺`);
  }

  if (typeof ch.id !== "string" || ch.id.trim() === "") {
    errors.push(`${p("id")}：必须是非空字符串`);
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(ch.id)) {
    errors.push(`${p("id")}：只能是小写字母、数字与连字符，如 de-01`);
  } else if (seenIds.has(ch.id)) {
    errors.push(`${p("id")}：与第 ${seenIds.get(ch.id)} 章重复`);
  } else {
    seenIds.set(ch.id, i + 1);
  }

  if (ch.seq !== i + 1) {
    errors.push(`${p("seq")}：必须是 ${i + 1}，与列表位置一致，现在是 ${fmt(ch.seq)}`);
  }

  if (typeof ch.pian !== "string" || !(PIANS as readonly string[]).includes(ch.pian)) {
    errors.push(`${p("pian")}：必须是「${PIANS.join("」或「")}」`);
  }

  if (Object.hasOwn(ch, "title")) {
    resolveText(ch.title, p("title"), errors, { allowEmpty: false });
  }

  validateMaps(ch.maps, p("maps"), errors);

  let baiwen: Bilingual = { hant: "", hans: "" };
  if (Object.hasOwn(ch, "baiwen")) {
    baiwen = resolveText(ch.baiwen, p("baiwen"), errors, { allowEmpty: false });
  }

  if (Object.hasOwn(ch, "yiwen")) {
    resolveText(ch.yiwen, p("yiwen"), errors, { allowEmpty: true });
  }
  if (Object.hasOwn(ch, "anyu")) {
    resolveText(ch.anyu, p("anyu"), errors, { allowEmpty: true });
  }

  validateJiaokan(ch.jiaokan, baiwen, witnessSet, p, errors);
}

function validateMaps(maps: unknown, path: string, errors: string[]): void {
  if (!isPlainObject(maps)) {
    errors.push(`${path}：必须是对象`);
    return;
  }
  const extra = Object.keys(maps).filter((k) => !MAP_ORDER.includes(k as MapKey));
  if (extra.length) {
    errors.push(`${path}：多了未知键 ${extra.map(quote).join("、")}`);
  }
  for (const key of MAP_ORDER) {
    if (!Object.hasOwn(maps, key)) {
      errors.push(`${path}.${key}：缺（无对照写 []）`);
      continue;
    }
    const ranges = maps[key];
    if (!Array.isArray(ranges)) {
      errors.push(`${path}.${key}：必须是列表`);
      continue;
    }
    ranges.forEach((item, i) => {
      const ip = `${path}.${key}[${i}]`;
      if (!isPlainObject(item)) {
        errors.push(`${ip}：必须是对象`);
        return;
      }
      const extraItem = Object.keys(item).filter((k) => k !== "from" && k !== "to");
      if (extraItem.length) {
        errors.push(`${ip}：只能有 from / to，多了 ${extraItem.map(quote).join("、")}`);
      }
      if (!positiveInt(item.from)) errors.push(`${ip}.from：必须是正整数`);
      if (!positiveInt(item.to)) errors.push(`${ip}.to：必须是正整数`);
      if (positiveInt(item.from) && positiveInt(item.to) && item.from > item.to) {
        errors.push(`${ip}：from 不能大于 to`);
      }
    });
  }
}

function validateJiaokan(
  list: unknown,
  baiwen: Bilingual,
  witnessSet: Set<string>,
  p: (key: string) => string,
  errors: string[],
): void {
  if (!Array.isArray(list)) {
    errors.push(`${p("jiaokan")}：必须是列表`);
    return;
  }

  const hantNotes = extractNoteNumbers(baiwen.hant);
  const hansNotes = extractNoteNumbers(baiwen.hans);
  if (hantNotes.join(",") !== hansNotes.join(",")) {
    errors.push(`${p("baiwen")}：简体注号为 ${fmtNotes(hansNotes)}，繁体为 ${fmtNotes(hantNotes)}`);
  }
  const seenBaiwen = new Set<number>();
  for (const n of hantNotes) {
    if (n < 1) errors.push(`${p("baiwen")}：注号必须大于 0，出现了 ${n}`);
    if (seenBaiwen.has(n)) errors.push(`${p("baiwen")}：注号 ${n} 重复`);
    seenBaiwen.add(n);
  }

  const seenN = new Set<number>();
  let zongshuo = 0;
  const jkNotes = new Set<number>();

  list.forEach((item, i) => {
    const jp = `${p("jiaokan")}[${i}]`;
    if (!isPlainObject(item)) {
      errors.push(`${jp}：必须是对象`);
      return;
    }
    const extra = Object.keys(item).filter((k) => !JIAOKAN_KEYS.has(k));
    if (extra.length) {
      errors.push(`${jp}：多了未知键 ${extra.map(quote).join("、")}`);
    }
    for (const k of JIAOKAN_KEYS) {
      if (!Object.hasOwn(item, k)) errors.push(`${jp}.${k}：缺`);
    }

    const n = item.n;
    if (n === null) {
      zongshuo += 1;
    } else if (!positiveInt(n)) {
      errors.push(`${jp}.n：必须是正整数或 null`);
    } else {
      if (seenN.has(n)) errors.push(`${jp}.n：注号 ${n} 重复`);
      seenN.add(n);
      jkNotes.add(n);
    }

    const lemmaAllowEmpty = n === null;
    if (Object.hasOwn(item, "lemma")) {
      resolveText(item.lemma, `${jp}.lemma`, errors, { allowEmpty: lemmaAllowEmpty });
    }

    if (Object.hasOwn(item, "readings")) {
      if (!isPlainObject(item.readings)) {
        errors.push(`${jp}.readings：必须是对象`);
      } else {
        for (const [wit, val] of Object.entries(item.readings)) {
          if (!witnessSet.has(wit)) {
            errors.push(`${jp}.readings：未登记的本子名${quote(wit)}`);
          }
          if (val === null) continue;
          resolveText(val, `${jp}.readings.${wit}`, errors, { allowEmpty: false });
        }
      }
    }

    if (item.choice === null) {
      if (n !== null) {
        errors.push(`${jp}.choice：非总说必须是已登记的本子名`);
      }
    } else if (typeof item.choice === "string") {
      if (!witnessSet.has(item.choice)) {
        errors.push(`${jp}.choice：未登记的本子名${quote(item.choice)}`);
      }
    } else if (Object.hasOwn(item, "choice")) {
      errors.push(`${jp}.choice：必须是本子名或 null`);
    }

    if (Object.hasOwn(item, "reason")) {
      resolveText(item.reason, `${jp}.reason`, errors, { allowEmpty: false });
    }
  });

  if (zongshuo > 1) {
    errors.push(`${p("jiaokan")}：总说（n 为 null）最多一条`);
  }

  for (const n of seenBaiwen) {
    if (!jkNotes.has(n)) {
      errors.push(`${p("jiaokan")}：白文有〔${n}〕，校记没有对应条`);
    }
  }
  for (const n of jkNotes) {
    if (!seenBaiwen.has(n)) {
      errors.push(`${p("jiaokan")}：有 n=${n}，白文没有〔${n}〕`);
    }
  }
}

function positiveInt(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n > 0;
}

function fmt(v: unknown): string {
  if (v === undefined) return "undefined";
  return JSON.stringify(v);
}

function fmtNotes(nums: number[]): string {
  return nums.length ? nums.join(",") : "（无）";
}
