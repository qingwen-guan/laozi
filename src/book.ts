import { loadYamlFile } from "./parse.js";
import { resolveText } from "./text.js";
import { MAP_ORDER, SchemaError, type Book, type Bilingual, type MapKey, type Pian, type Script } from "./types.js";
import { validateBook } from "./validate.js";

export function loadBook(filePath: string): Book {
  const data = loadYamlFile(filePath);
  const errors = validateBook(data);
  if (errors.length) throw new SchemaError(errors);
  return normalizeBook(data);
}

export function normalizeBook(data: unknown): Book {
  if (typeof data !== "object" || data === null) {
    throw new SchemaError(["根节点必须是对象"]);
  }
  const raw = data as {
    meta: { title: unknown; wenda: Array<{ q: unknown; a: unknown }> };
    witnesses: string[];
    chapters: Array<Record<string, unknown>>;
  };
  const dummy: string[] = [];
  return {
    meta: {
      title: resolveText(raw.meta.title, "meta.title", dummy),
      wenda: raw.meta.wenda.map((item) => ({
        q: resolveText(item.q, "q", dummy, { allowEmpty: false }),
        a: resolveText(item.a, "a", dummy, { allowEmpty: false }),
      })),
    },
    witnesses: [...raw.witnesses],
    chapters: raw.chapters.map((ch) => ({
      id: String(ch.id),
      seq: Number(ch.seq),
      pian: ch.pian as Pian,
      title: resolveText(ch.title, "title", dummy),
      maps: ch.maps as Book["chapters"][number]["maps"],
      baiwen: resolveText(ch.baiwen, "baiwen", dummy),
      jiaokan: (ch.jiaokan as Array<Record<string, unknown>>).map((item) => ({
        n: item.n as number | null,
        lemma: resolveText(item.lemma, "lemma", dummy),
        readings: Object.fromEntries(
          Object.entries(item.readings as Record<string, unknown>).map(([wit, val]) => [
            wit,
            val === null ? null : resolveText(val, wit, dummy),
          ]),
        ),
        choice: item.choice as string | null,
        reason: resolveText(item.reason, "reason", dummy),
      })),
      yiwen: resolveText(ch.yiwen, "yiwen", dummy),
      anyu: resolveText(ch.anyu, "anyu", dummy),
    })),
  };
}

export function pickScript(text: Bilingual, script: Script): string {
  return text[script];
}

export const MAP_LABELS: Record<MapKey, Bilingual> = {
  received: { hant: "通行本", hans: "通行本" },
  mawangdui: { hant: "帛書", hans: "帛书" },
  beida: { hant: "北大漢簡", hans: "北大汉简" },
  guodian: { hant: "郭店", hans: "郭店" },
};

export function mapIndex(book: Book) {
  const out: Array<{
    key: MapKey;
    rows: Array<{ from: number; to: number; chapter: Book["chapters"][number] }>;
  }> = [];
  for (const key of MAP_ORDER) {
    const rows: Array<{ from: number; to: number; chapter: Book["chapters"][number] }> = [];
    for (const ch of book.chapters) {
      for (const range of ch.maps[key]) {
        rows.push({ from: range.from, to: range.to, chapter: ch });
      }
    }
    rows.sort((a, b) => a.from - b.from || a.to - b.to);
    out.push({ key, rows });
  }
  return out;
}
