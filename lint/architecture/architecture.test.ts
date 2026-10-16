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
      process.execPath,
      [resolve("lint/architecture/check.js"), root],
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
  expect(result.stdout).toContain("Scattered Module");
});

test("shared implementation symbols connect exported operations", () => {
  const result = scan({
    "src/main.ts": "function shared() { return 1; }\n" + connected,
  });

  expect(result.status).toBe(0);
  expect(result.stdout).toContain("No smells found matching current filters.");
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
  expect(result.stdout).toContain("No smells found matching current filters.");
});

function consumers(folder: string, suffix: string) {
  return Object.fromEntries(
    Array.from({ length: 31 }, (_, index) => [
      `${folder}/consumer${index}${suffix}.ts`,
      'import { shared } from "#root/src/main.ts"; export const value = shared;',
    ]),
  );
}

test("excessive implementation coupling fails", () => {
  const result = scan({
    "src/main.ts": "export const shared = 1;",
    ...consumers("src", ""),
  });

  expect(result.status).toBe(1);
  expect(result.stdout).toContain("High Coupling");
});

test("test consumers do not inflate implementation coupling", () => {
  const result = scan({
    "src/main.ts": "export const shared = 1;",
    ...consumers("src", ".test"),
  });

  expect(result.status).toBe(0);
  expect(result.stdout).toContain("No smells found matching current filters.");
});

test("a simple module with many producers and consumers fails the hub gate", () => {
  const providers = Array.from({ length: 8 }, (_, index) => `provider${index}`);
  const result = scan({
    "src/main.ts":
      providers
        .map((name) => `import { ${name} } from "#root/src/${name}.ts";`)
        .join("\n") +
      `\nexport const shared = () => ${providers.map((name) => `${name}()`).join(" + ")};`,
    ...Object.fromEntries(
      providers.map((name) => [
        `src/${name}.ts`,
        `export const ${name} = () => 1;`,
      ]),
    ),
    ...consumers("src", ""),
  });

  expect(result.status).toBe(1);
  expect(result.stdout).toContain("Hub Module");
});
