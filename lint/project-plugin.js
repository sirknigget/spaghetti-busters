import { definePlugin } from "@oxlint/plugins";
import { folderLimits } from "#root/lint/folder-limits.js";
import { rootImports } from "#root/lint/root-imports.js";

export default definePlugin({
  meta: { name: "spaghetti-project" },
  rules: {
    "folder-limits": folderLimits,
    "root-imports": rootImports,
  },
});
