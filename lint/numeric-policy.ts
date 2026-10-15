import type { Linter } from "eslint";

/** Runtime values must come from named constants or declarative tuning data. */
export const numericRules: Linter.RulesRecord = {
  "no-magic-numbers": [
    "error",
    {
      ignore: [0, 1, -1],
      detectObjects: true,
      enforceConst: true,
      ignoreEnums: true,
      ignoreNumericLiteralTypes: true,
    },
  ],
};
