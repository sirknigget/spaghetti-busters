import policy from "#root/lint/architecture/archlint.json" with { type: "json" };
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

// This launcher only scopes input; Archlint supplies every rule and failure status.
// 0.17.1 still counts ignored test imports in graph metrics, so an implementation-
// only scan requires physically omitting tests/fixtures/config from a temporary tree.
const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
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
  // Archlint resolves aliases against the nearest package root. This marker and
  // the config's #root alias preserve internal edges without copying build tooling;
  // tsconfig discovery is disabled because the snapshot intentionally lacks it.
  writeFileSync(join(temporaryRoot, "package.json"), "{}");

  // 0.17.1 checks the stale ID "scattered_module" when enabling symbol collection.
  // The config selects lcom to collect symbols for module_cohesion, then excludes
  // every file from lcom findings. Remove this workaround when upstream fixes it:
  // https://github.com/archlinter/archlint/blob/v0.17.1/crates/archlint/src/parser/types.rs
  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(import.meta.resolve("@archlinter/cli/bin/archlint.js")),
      "scan",
      join(temporaryRoot, "src"),
      "--config",
      join(projectRoot, "lint/architecture/archlint.json"),
      "--detectors",
      // Restrict native detectors to the configured rules, with one source of truth.
      Object.keys(policy.rules).join(","),
      // Each snapshot is disposable; caching it is wasteful and has no reuse.
      "--no-cache",
      // These metrics use source structure, so the snapshot needs no Git history.
      "--no-git",
    ],
    { encoding: "utf8" },
  );

  // Map disposable paths back to editable files without filtering any diagnostics.
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
