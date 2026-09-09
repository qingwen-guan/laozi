import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

type FontCopy = {
  pkg: string;
  file: string;
  dest: string;
};

const FONTS: FontCopy[] = [
  {
    pkg: "@fontsource/noto-serif-tc",
    file: "files/noto-serif-tc-chinese-traditional-400-normal.woff2",
    dest: "noto-serif-tc-400.woff2",
  },
  {
    pkg: "@fontsource/noto-serif-tc",
    file: "files/noto-serif-tc-chinese-traditional-600-normal.woff2",
    dest: "noto-serif-tc-600.woff2",
  },
  {
    pkg: "@fontsource/noto-serif-sc",
    file: "files/noto-serif-sc-chinese-simplified-400-normal.woff2",
    dest: "noto-serif-sc-400.woff2",
  },
  {
    pkg: "@fontsource/noto-serif-sc",
    file: "files/noto-serif-sc-chinese-simplified-600-normal.woff2",
    dest: "noto-serif-sc-600.woff2",
  },
];

export function copyFonts(destDir: string): void {
  mkdirSync(destDir, { recursive: true });
  for (const font of FONTS) {
    const pkgRoot = dirname(require.resolve(`${font.pkg}/package.json`));
    cpSync(join(pkgRoot, font.file), join(destDir, font.dest));
  }
}
