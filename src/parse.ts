import { readFileSync } from "node:fs";
import { parse as parseYaml, YAMLParseError } from "yaml";

export class SyntaxErrorWithHint extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SyntaxErrorWithHint";
  }
}

export function loadYamlFile(filePath: string): unknown {
  return parseYamlSource(readFileSync(filePath, "utf8"), filePath);
}

export function parseYamlSource(source: string, filePath = "laozi.yaml"): unknown {
  try {
    return parseYaml(source);
  } catch (err) {
    throw new SyntaxErrorWithHint(formatSyntaxError(err, source, filePath));
  }
}

function formatSyntaxError(err: unknown, source: string, filePath: string): string {
  let line = 0;
  let col = 0;
  if (err instanceof YAMLParseError && err.linePos?.[0]) {
    line = err.linePos[0].line;
    col = err.linePos[0].col;
  } else {
    const m = String(err instanceof Error ? err.message : err).match(/at line (\d+), column (\d+)/i);
    if (m) {
      line = Number(m[1]);
      col = Number(m[2]);
    }
  }

  const hint = lastChapterHint(source, line);
  const loc = line ? `${filePath}:${line}:${col || 1}` : filePath;
  const tail = hint ? `，${hint}` : "";
  return `${loc} 语法错误${tail}。请检查缩进。`;
}

export function lastChapterHint(source: string, errorLine: number): string {
  if (!errorLine) return "";
  const lines = source.split(/\r?\n/);
  const limit = Math.min(errorLine, lines.length);
  let lastId: string | null = null;
  let lastSeq: string | null = null;
  let count = 0;

  for (let i = 0; i < limit; i++) {
    const idMatch = lines[i]?.match(/^\s+- id:\s*(.+?)\s*$/);
    if (idMatch?.[1]) {
      count += 1;
      lastId = idMatch[1].replace(/^["']|["']$/g, "");
      lastSeq = null;
      continue;
    }
    const seqMatch = lines[i]?.match(/^\s+seq:\s*(\d+)\s*$/);
    if (seqMatch?.[1] && lastId) lastSeq = seqMatch[1];
  }

  if (lastId) {
    const seqBit = lastSeq ? `（seq ${lastSeq}）` : "";
    return `上一章已读到 id=${lastId}${seqBit}`;
  }
  if (count) return `出错位置大约在 chapters 第 ${count} 项附近`;
  return "";
}
