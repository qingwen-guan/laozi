# 老子

个人对《老子》的校本。德经在前，分章按己见重划。判断可改，改了只留当前理由。

文献太多，各家各有立场。作者只是爱好者，没有成名负担，也不守某一派。哪个读法、哪句理解更靠谱，就改过去。

源是一份 YAML。由此生成繁简、白文/详本、横竖、现代/线装等成品（网页与 PDF）。

## 文档

- [动机与体例](docs/体例.md)
- [源格式](docs/源格式.md)
- [构建与出品](docs/构建.md)

## 命令

```bash
npm install
npm test
npm run fmt
npm run lint
npm run typecheck
npm run validate
npm run build
npm run serve
```

- `npm run build`：网页 + 默认八种 PDF
- `npm run build:web`：只要网页
- `npm run build:pdf`：只要默认 PDF
- `npm run serve`：先构建网页，再在 `0.0.0.0:8765` 开静态服务

网页在 `dist/web/index.html`。PDF 在 `dist/pdf/`。线上见 [构建与出品](docs/构建.md)。

源文件是 `laozi.yaml`。现在只有一章样张（上德不德），用来验收体例和版式。判断可以改。
