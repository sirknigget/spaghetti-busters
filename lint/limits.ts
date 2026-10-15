import type { Linter } from "eslint";

const MAX_PARAMETERS = 3;
const signatureNodes =
  ":matches(TSMethodSignature, TSCallSignatureDeclaration, TSConstructSignatureDeclaration, TSConstructorType, TSEmptyBodyFunctionExpression)";

const memberLimits = [
  ["ClassBody[body.length>30]", "Classes may declare at most 30 members."],
  [
    "TSInterfaceBody[body.length>30]",
    "Interfaces may declare at most 30 members.",
  ],
  [
    "TSTypeLiteral[members.length>30]",
    "Object types may declare at most 30 members.",
  ],
];

/** Count physical lines, including comments and blank lines, in every code scope. */
export const limitRules: Linter.RulesRecord = {
  "max-lines": [
    "error",
    { max: 300, skipBlankLines: false, skipComments: false },
  ],
  "max-lines-per-function": [
    "error",
    { max: 40, skipBlankLines: false, skipComments: false, IIFEs: true },
  ],
  "max-params": ["error", { max: 3, countThis: "never" }],
  "no-restricted-syntax": [
    "error",
    ...memberLimits.map(([selector, message]) => ({ selector, message })),
    ...[MAX_PARAMETERS, MAX_PARAMETERS + 1].map((max) => ({
      selector: `${signatureNodes}[params.length>${max}]${
        max === MAX_PARAMETERS
          ? ':not([params.0.name="this"])'
          : '[params.0.name="this"]'
      }`,
      message:
        "TypeScript signatures may declare at most 3 parameters (excluding this).",
    })),
  ],
};
