# 构建与出品

源只有 `laozi.yaml`。网页和 PDF 都从它来。

需要 Node，版本见 `package.json` 的 `engines.node`。

```bash
npm install
npm run validate
npm run build        # 网页 dist/web，PDF dist/pdf（默认十种）
npm run build:web
npm run build:pdf
npm run serve          # 0.0.0.0:8765；just serve 同此
npm test
npm run fmt            # Biome 格式化（范围见 biome.json）
npm run lint           # Biome 检查
npm run typecheck
```

## 流水线

```
laozi.yaml
    → 解析 YAML
    → schema / 注号 / 对照校验
    → 规范数据（内存中的全书）
    → HTML 模板
         ├─ 网页（屏幕：可开关层、繁简、横竖、现代/线装）
         └─ 印刷用 HTML
              → Vivliostyle
              → PDF
```

要点：

- **HTML 先行。** 横竖只换 CSS，不换引擎。
- **PDF 用 Vivliostyle。** 它按 CSS Paged Media 分页，竖排（`writing-mode: vertical-rl`）是正经用例。不用 Typst（竖排未稳），不用 TeX 做主引擎（网页就得另做一套），不用开源繁简转换。
- 今译、按语：YAML 取出后按 Markdown 渲成 HTML。白文、lemma、异文只做纯文本（及注号、补字约定）。
- 精简本 / 详本是裁层，不是第二份源。印刷精简本不生成校记、今译、按语，白文里的注号也去掉；补字保留。网页仍出详本，用开关藏层。

## 出品的轴

| 轴 | 取值 | 谁决定 |
| --- | --- | --- |
| 用字 | `hant` / `hans` | 源里当场写的文本 |
| 厚度 | 白文 / 详本 | 生成时裁层 |
| 方向 | 横 / 竖 | CSS |
| 外观 | 现代 / 线装 | CSS 主题 |

四轴独立。线装是皮肤，横竖都能用。

详本层序固定：白文（含注号）→ 校记 → 今译 → 按语。校记按 `witnesses` 的顺序罗列各本；`null` 的本子标为残或缺。

网页上四轴都可开关。PDF 是某一次裁切的固定本，避免同一本书在纸上有十六种读法。

## 默认要打出的 PDF

流水线必须能出任意合法组合。默认只打这些：

| 用字 | 厚度 | 方向 | 外观 |
| --- | --- | --- | --- |
| hant | 详本 | 横 | 现代 |
| hant | 详本 | 横 | 线装 |
| hant | 详本 | 竖 | 现代 |
| hant | 详本 | 竖 | 线装 |
| hant | 白文 | 竖 | 现代 |
| hans | 详本 | 横 | 现代 |
| hans | 详本 | 横 | 线装 |
| hans | 详本 | 竖 | 现代 |
| hans | 详本 | 竖 | 线装 |
| hans | 白文 | 竖 | 现代 |

合法组合共十六种：上表十种，再加上两种用字各自的「白文横版现代」「白文横版线装」「白文竖版线装」。

```bash
npx tsx src/cli.ts build --pdf          # 默认十种
npx tsx src/cli.ts build --all-pdf      # 全部十六种
npx tsx src/cli.ts build --combo hant-full-v-xianzhuang
npx tsx src/cli.ts build --combo hans-text-h --combo hant-text-v-xianzhuang
```

`--pdf`、`--all-pdf`、`--combo` 三种只能挑一种。要几种指定组合，就写多个 `--combo`。

命名：`laozi-{hant|hans}-{full|text}-{h|v}[-xianzhuang].pdf`。`--combo` 可写文件名或去掉 `laozi-` 与 `.pdf` 的短名。

## GitHub Pages

成品在 `dist/`，已进 `.gitignore`，不能拿「Branch + 仓库根目录」当发布源。

Settings → Pages → Build and deployment → Source 选 **GitHub Actions**（不要 Branch）。Visibility / GitHub Enterprise 那一块可以不理。

工作流是 `.github/workflows/pages.yml`：推送到发布分支后构建并挂上 `dist/web`。发布分支和检查步骤只以该文件为准。仓库须公开（免费账号的私有库不能出公共 Pages）。

## 网页

同一份规范数据，一套模板。

- 默认可读详本；层可关到只剩白文。全书没有的层不出现开关，也不写 `data-layer-*`。
- 繁简、横竖、现代/线装可切。四轴独立。
- 竖排网页按幅翻页：封面、目录、对照、各章、问答各占一屏。左右键、PageUp/PageDown，或点左右缘翻页。目录和注号仍跳到对应幅。没有脚本时仍是整书横滑。横排仍整书连读。印刷分页不变。
- 注号可点，跳到该章校记对应条。
- 提供「通行本第〇章 → 本书第〇章」一类对照（由各章 `maps` 汇总）。
- 工具栏书题与封面、页签同一份 `meta.title`。
- 书后问答来自 `meta.wenda`（至少一条）。目录有入口。网页与印刷都出；印刷另起一页。
- 界面文案在 `web/templates/parts.html`，id 以 `ui-` 开头：一行表示繁简同形，两行则先繁后简。
- 开关合法值在 `web/js/ui-state.js`（JSDoc 标类型），竖排翻页在 `web/js/slides.js`。构建时 `web/js/*.js` 原样拷到 `js/`。轴的类型用 `src/types.ts` 的 `Script` / `Dir` / `Theme`。文案对的读写在 `src/template.ts`（`parseUi` / `uiPair`）。

## 样张先于全书铺开

实现顺序：

1. 按 [源格式](source.md) 写校验（含「第几章第几键」报错）。
2. 在 `laozi.yaml` 里放 **一章** 真内容当样张。
3. 出这一章的网页，以及默认表里与「有样张即可验」相关的 PDF（至少：详本繁体横版现代、详本繁体横版线装、详本繁体竖版现代、详本繁体竖版线装）。
4. 版式可接受后，再写其余章，再开默认全套 PDF。

不要先做完八十章再看竖排标点是否能用。

## 字体

网页和 PDF 使用 **Noto Serif TC**（繁）与 **Noto Serif SC**（简）。字体随 `npm install` 进 `node_modules`（`@fontsource/noto-serif-sc` / `tc`），构建时拷到 `dist/*/fonts/`，用本地 `@font-face`，**不请求 Google Fonts**。读网页不需要翻墙。

源码是 TypeScript（`src/*.ts`），用 `tsx` 直接跑。`web/js/ui-state.js` 与 `web/js/slides.js` 进 `tsc`；`web/js/*.js` 构建时原样拷走。`npm run fmt` / `lint` 的范围只在 `biome.json`。

## 现状

校验、网页、默认十种 PDF 已通。源里目前只有一章样张。版式仍可改 CSS，不必动 YAML 字段。
