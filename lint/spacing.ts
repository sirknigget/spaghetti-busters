import type { Linter } from "eslint";

/** Keep statements and control flow readable before measuring source size. */
export const spacingRules: Linter.RulesRecord = {
  curly: ["error", "all"],
  "no-sequences": "error",
  "one-var": ["error", "never"],
  "@stylistic/max-statements-per-line": ["error", { max: 1 }],
  "@stylistic/brace-style": ["error", "1tbs", { allowSingleLine: false }],
  "@stylistic/lines-between-class-members": [
    "error",
    {
      enforce: [
        { blankLine: "always", prev: "method", next: "*" },
        { blankLine: "always", prev: "*", next: "method" },
      ],
    },
  ],
  "@stylistic/padding-line-between-statements": [
    "error",
    { blankLine: "always", prev: "import", next: "*" },
    { blankLine: "any", prev: "import", next: "import" },
    { blankLine: "always", prev: "*", next: "return" },
    { blankLine: "always", prev: "*", next: ["function", "class"] },
    { blankLine: "always", prev: ["function", "class"], next: "*" },
    { blankLine: "always", prev: ["const", "let", "var"], next: "*" },
    { blankLine: "always", prev: "*", next: ["const", "let", "var"] },
    {
      blankLine: "any",
      prev: ["const", "let", "var"],
      next: ["const", "let", "var"],
    },
    { blankLine: "always", prev: "block-like", next: "*" },
  ],
};
