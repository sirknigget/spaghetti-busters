import policy from "#root/lint/architecture/archlint.json" with { type: "json" };
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const policyRoot = fileURLToPath(new URL("../../", import.meta.url));
const PROJECT_ARGUMENT_INDEX = 2;
const projectRoot = resolve(process.argv[PROJECT_ARGUMENT_INDEX] ?? ".");
const source = join(projectRoot, "src");
const temporaryRoot = mkdtempSync(
  join(tmpdir(), "implementation-architecture-"),
);
const excluded =
  /(?:(^|\/)(tests|__tests__|fixtures)(\/|$))|(?:\.(test|spec|config)\.[^/]+$)/;

try {
  cpSync(source, join(temporaryRoot, "src"), {
    recursive: true,
    filter: (path) =>
      !excluded.test(relative(source, path).replaceAll("\\", "/")),
  });
  writeFileSync(join(temporaryRoot, "package.json"), "{}");

  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(import.meta.resolve("@archlinter/cli/bin/archlint.js")),
      "scan",
      join(temporaryRoot, "src"),
      "--config",
      join(policyRoot, "lint/architecture/archlint.json"),
      "--detectors",
      Object.keys(policy.rules).join(","),
      "--no-cache",
      "--no-git",
    ],
    { encoding: "utf8" },
  );

  process.stdout.write(
    (result.stdout ?? "").replaceAll(temporaryRoot, projectRoot),
  );
  process.stderr.write(
    (result.stderr ?? "").replaceAll(temporaryRoot, projectRoot),
  );
  if (result.error) {
    process.stderr.write(`${result.error.message}\n`);
  }

  process.exitCode = result.status ?? 1;
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
