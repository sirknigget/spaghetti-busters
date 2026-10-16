import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { expect, test } from "vitest";

const disconnected = Array.from(
  { length: 5 },
  (_, index) => `export function operation${index}() { return ${index}; }`,
).join("\n");
const connected = Array.from(
  { length: 5 },
  (_, index) => `export function operation${index}() { return shared(); }`,
).join("\n");

function writeFixture(root: string, path: string, source: string) {
  const target = join(root, path);

  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, source);
}

function scan(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), "architecture-policy-"));

  try {
    writeFixture(root, "package.json", "{}");
    for (const [path, source] of Object.entries(files)) {
      writeFixture(root, path, source);
    }

    return spawnSync(
      resolve("node_modules/.bin/archlint"),
      [
        "scan",
        join(root, "src"),
        "--config",
        resolve("lint/architecture/archlint.json"),
        "--detectors",
        "module_cohesion,lcom",
        "--no-cache",
        "--no-git",
        "--json",
      ],
      { encoding: "utf8" },
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("disconnected implementation exports fail as errors", () => {
  const result = scan({ "src/main.ts": disconnected });

  expect(result.error).toBeUndefined();
  expect(result.status).toBe(1);
  expect(result.stdout).toContain("ScatteredModule");
});

test("shared implementation symbols connect exported operations", () => {
  const result = scan({
    "src/main.ts": "function shared() { return 1; }\n" + connected,
  });

  expect(result.status).toBe(0);
  expect(result.stdout).toContain('"total_smells": 0');
});

test("tests, fixtures, lint tools, and declarative files are outside cohesion scope", () => {
  const result = scan({
    "src/main.ts": "export const application = 1;",
    "src/main.test.ts": disconnected,
    "src/fixtures/sample.ts": disconnected,
    "src/domain-types.ts": disconnected,
    "src/domain-settings.ts": disconnected,
    "src/domain-config.ts": disconnected,
    "lint/check.ts": disconnected,
  });

  expect(result.status).toBe(0);
  expect(result.stdout).toContain('"total_smells": 0');
});
