export type Script = "hant" | "hans";
export type Dir = "h" | "v";
export type Theme = "modern" | "xianzhuang";
export type Layers = "full" | "text";
export const PIANS = ["德经", "道经"] as const;
export type Pian = (typeof PIANS)[number];
export const MAP_ORDER = ["received", "mawangdui", "beida", "guodian"] as const;
export type MapKey = (typeof MAP_ORDER)[number];

export type Bilingual = {
  hant: string;
  hans: string;
};

export type MapRange = {
  from: number;
  to: number;
};

export type Maps = Record<MapKey, MapRange[]>;

export type JiaokanItem = {
  n: number | null;
  lemma: Bilingual;
  readings: Record<string, Bilingual | null>;
  choice: string | null;
  reason: Bilingual;
};

export type Chapter = {
  id: string;
  seq: number;
  pian: Pian;
  title: Bilingual;
  maps: Maps;
  baiwen: Bilingual;
  jiaokan: JiaokanItem[];
  yiwen: Bilingual;
  anyu: Bilingual;
};

export type Book = {
  meta: { title: Bilingual };
  witnesses: string[];
  chapters: Chapter[];
};

export type PdfCombo = {
  script: Script;
  layers: Layers;
  dir: Dir;
  theme: Theme;
};

export type ResolveTextOptions = {
  allowEmpty?: boolean;
};

export class SchemaError extends Error {
  readonly errors: string[];

  constructor(errors: string[]) {
    super(errors.map((e) => `  ${e}`).join("\n"));
    this.name = "SchemaError";
    this.errors = errors;
  }
}
