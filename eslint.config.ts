/*
 * Applies typed SonarJS and remaining ESLint-only checks in source and test scopes.
 * Uses a dedicated TypeScript project covering source, tests, and tools.
 */
import { numericRules } from "#root/lint/numeric-policy.ts";
import { limitRules, restrictedSyntax } from "#root/lint/limits.ts";
import { spacingRules } from "#root/lint/spacing.ts";
import parser from "@typescript-eslint/parser";
import sonarjs from "eslint-plugin-sonarjs";
import unicorn from "eslint-plugin-unicorn";
import react from "@eslint-react/eslint-plugin";
import stylistic from "@stylistic/eslint-plugin";
import type { TSESLint } from "@typescript-eslint/utils";
import type { Linter } from "eslint";

const MAX_REGEX_COMPLEXITY = 20;
const colorPatterns = [
  /#[0-9a-f]{3,8}\b/i,
  /\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix|device-cmyk|light-dark|contrast-color)\s*\(/i,
];

// Checks source and tool code with typed SonarJS and remaining ESLint-only rules.
const sourceRules: Linter.RulesRecord = {
  ...numericRules,
  "sonarjs/prefer-immediate-return": "error",
  "sonarjs/no-ignored-return": "error",
  "sonarjs/arguments-order": "error",
  "sonarjs/index-of-compare-to-positive-number": "error",
  "sonarjs/no-useless-intersection": "error",
  "sonarjs/no-undefined-argument": "error",
  "sonarjs/disabled-resource-integrity": "error",
  "sonarjs/empty-string-repetition": "error",
  "sonarjs/regex-complexity": ["error", { threshold: MAX_REGEX_COMPLEXITY }],
  "sonarjs/anchor-precedence": "error",
  "sonarjs/slow-regex": "error",
  "sonarjs/no-invalid-regexp": "error",
  "sonarjs/unused-named-groups": "error",
  "sonarjs/no-misleading-character-class": "error",
  "sonarjs/duplicates-in-character-class": "error",
  "@eslint-react/no-access-state-in-setstate": "error",
  "sonarjs/prefer-read-only-props": "error",
  "sonarjs/reduce-initial-value": "error",
  "sonarjs/no-small-switch": "error",
  "no-octal": "error",
  "sonarjs/bitwise-operators": "error",
  "sonarjs/constructor-for-side-effects": "error",
  "sonarjs/sql-queries": "error",
  "sonarjs/no-selector-parameter": "error",
  "sonarjs/no-empty-character-class": "error",
  "sonarjs/post-message": "error",
  "sonarjs/no-alphabetical-sort": "error",
  "sonarjs/new-operator-misuse": ["error", { considerJSDoc: false }],
  "sonarjs/no-incorrect-string-concat": "error",
  "sonarjs/no-associative-arrays": "error",
  "sonarjs/void-use": "error",
  "sonarjs/no-inconsistent-returns": "error",
  "sonarjs/no-collection-size-mischeck": "error",
  "sonarjs/no-in-misuse": "error",
  "sonarjs/no-redundant-optional": "error",
  "sonarjs/no-try-promise": "error",
  "sonarjs/no-empty-after-reluctant": "error",
  "sonarjs/single-character-alternation": "error",
  "sonarjs/single-char-in-character-classes": "error",
  "sonarjs/jsx-no-leaked-render": "error",
  "no-octal-escape": "error",
  "sonarjs/no-async-constructor": "error",
  "unicorn/no-named-default": "error",
  "unicorn/dom-node-dataset": "error",
  "sonarjs/dompurify-unsafe-config": "error",
  "sonarjs/super-linear-regex": "error",
  "sonarjs/prefer-native-lodash-alternative": "error",
  "sonarjs/no-misleading-array-reverse": "error",
  "sonarjs/disabled-auto-escaping": "error",
  "sonarjs/no-empty-alternatives": "error",
  "sonarjs/no-control-regex": "error",
  "sonarjs/no-regex-spaces": "error",
  "sonarjs/existing-groups": "error",
  "sonarjs/no-empty-group": "error",
  "sonarjs/concise-regex": "error",
  "@eslint-react/no-unused-class-component-members": "error",
  "sonarjs/prefer-regexp-exec": "error",
  "@stylistic/jsx-child-element-spacing": "error",
  "unicorn/no-unnecessary-polyfills": "error",
};

// Checks applicable Playwright assertions requiring TypeScript project information.
const testRules: Linter.RulesRecord = {
  "sonarjs/assertions-in-tests": "error",
  "sonarjs/no-incompatible-assertion-types": "error",
};

// Combines typed parsing, plugins, and the residual source/test rule groups.
const eslintConfig: TSESLint.FlatConfig.Config[] = [
  {
    ignores: [
      "dist/**",
      "playwright-report/**",
      "test-results/**",
      "node_modules/**",
      "tests/**/*-snapshots/**",
      ".quality-results/**",
    ],
  },
  {
    name: "quality/package",
    files: ["**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"],
    languageOptions: {
      parser,
      parserOptions: {
        project: "./tsconfig.lint.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      sonarjs,
      unicorn,
      "@eslint-react": react,
      "@stylistic": stylistic,
    },
  },
  {
    name: "quality/spacing",
    files: ["**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"],
    rules: {
      ...spacingRules,
      ...limitRules,
    },
  },
  {
    name: "quality/color-strings",
    files: ["**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"],
    ignores: ["src/game/palette.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...restrictedSyntax,
        ...[
          ["Literal:not([regex])", "value"],
          ["TemplateElement", "value.raw"],
        ].flatMap(([node, value]) =>
          colorPatterns.map((pattern) => ({
            selector: `${node}[${value}=${pattern}]`,
            message: "Use a named color from src/game/palette.ts.",
          })),
        ),
      ],
    },
  },
  {
    name: "quality/source",
    files: ["**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"],
    ignores: ["tests/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}", "src/**/*.test.ts"],
    rules: sourceRules,
  },
  {
    name: "quality/tests",
    files: ["tests/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}", "src/**/*.test.ts"],
    rules: testRules,
  },
];

export default eslintConfig;
