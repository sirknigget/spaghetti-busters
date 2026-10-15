import { definePlugin } from "@oxlint/plugins";
import { folderLimits } from "#root/lint/folder-limits.js";

export default definePlugin({
  meta: { name: "spaghetti-project" },
  rules: {
    "folder-limits": folderLimits,
  },
});
