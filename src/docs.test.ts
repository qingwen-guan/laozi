import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function commandFence(md: string): string {
  const fences = [...md.matchAll(/```bash\n([\s\S]*?)\n```/g)].map((m) => m[1]);
  const block = fences.find((f) => f.includes("npm install"));
  assert.ok(block, "docs/build.md 应有命令表");
  return block;
}

function documentedScripts(block: string): string[] {
  const names: string[] = [];
  for (const raw of block.split("\n")) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const run = /^npm run (\S+)$/.exec(line);
    if (run) {
      names.push(run[1]);
      continue;
    }
    if (line === "npm test") {
      names.push("test");
      continue;
    }
    if (line === "npm install") continue;
    assert.fail(`命令表多出：${line}`);
  }
  return names;
}

test("工作流用 package.json 里的 Node 版本", () => {
  const pkg = JSON.parse(read("package.json")) as { engines?: { node?: string } };
  assert.equal(typeof pkg.engines?.node, "string");
  assert.ok(pkg.engines?.node);

  const workflow = read(".github/workflows/pages.yml");
  assert.match(workflow, /node-version-file:\s*package\.json/);
  assert.doesNotMatch(workflow, /^\s*node-version:/m);
});

test("fmt 与 lint 都处理 TODO.md", () => {
  const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
  assert.match(pkg.scripts.fmt, /TODO\.md/);
  assert.match(pkg.scripts.lint, /TODO\.md/);
});

test("构建文档列出全部 npm 脚本，README 不重复", () => {
  const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
  const scripts = Object.keys(pkg.scripts).sort();
  const documented = documentedScripts(commandFence(read("docs/build.md"))).sort();
  assert.deepEqual(documented, scripts);

  const readme = read("README.md");
  assert.doesNotMatch(readme, /```bash/);
  assert.doesNotMatch(readme, /npm run /);
  assert.doesNotMatch(readme, /npm test/);
});
