/** @import { Context, ESTree, Rule } from "@oxlint/plugins" */
/** @typedef {{ path: string, files: number, subfolders: number }} FolderSize */
/** @typedef {{ maxFiles: number, maxSubfolders: number }} FolderLimits */
import { readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = fileURLToPath(new URL("../", import.meta.url));

/** @param {string} path
 * @returns {Generator<FolderSize>}
 */
function* folders(path) {
  const entries = readdirSync(path, { withFileTypes: true });
  const children = entries.filter((entry) => entry.isDirectory());

  yield {
    path,
    files: entries.length - children.length,
    subfolders: children.length,
  };
  for (const child of children) {
    yield* folders(join(path, child.name));
  }
}

/** @param {Context} context
 * @param {ESTree.Program} node
 * @param {FolderSize} size
 */
function reportFolder(context, node, size) {
  // Oxlint validates these required numeric fields against the rule schema.
  const limits = /** @type {FolderLimits} */ (context.options[0]);

  for (const [kind, limit] of /** @type {const} */ ([
    ["files", limits.maxFiles],
    ["subfolders", limits.maxSubfolders],
  ])) {
    if (size[kind] > limit) {
      context.report({
        node,
        messageId: "folderLimit",
        data: {
          folder: relative(PROJECT_ROOT, size.path),
          kind,
          count: size[kind],
          limit,
        },
      });
    }
  }
}

/** @type {Rule} */
export const folderLimits = {
  meta: {
    type: "suggestion",
    schema: [
      {
        type: "object",
        properties: {
          maxFiles: { type: "integer", minimum: 1 },
          maxSubfolders: { type: "integer", minimum: 1 },
        },
        required: ["maxFiles", "maxSubfolders"],
        additionalProperties: false,
      },
    ],
    messages: {
      folderLimit:
        "{{folder}} has {{count}} direct {{kind}}; maximum is {{limit}}.",
    },
  },
  createOnce(context) {
    let checked = false;

    return {
      Program(node) {
        if (checked) {
          return;
        }

        checked = true;
        for (const root of ["src", "tests"]) {
          for (const size of folders(resolve(PROJECT_ROOT, root))) {
            reportFolder(context, node, size);
          }
        }
      },
    };
  },
};
