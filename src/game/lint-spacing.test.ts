import { expect, test } from "vitest";
import { Linter } from "eslint";
import { format } from "prettier";
import stylistic from "@stylistic/eslint-plugin";
import { spacingRules } from "../../lint/spacing";

const linter = new Linter();
const config = {
  plugins: { "@stylistic": stylistic },
  rules: spacingRules,
};

test.each([
  ["let a = 1; a++;", "@stylistic/max-statements-per-line"],
  ["if (ready) work();", "curly"],
  ["function f() { work(); }", "@stylistic/brace-style"],
  [
    "function f() {\n  work();\n  return 1;\n}",
    "@stylistic/padding-line-between-statements",
  ],
  [
    "class C {\n  a() {}\n  b() {}\n}",
    "@stylistic/lines-between-class-members",
  ],
])("rejects condensed source: %s", (source, rule) => {
  const messages = linter.verify(source, config);

  expect(messages.map((message) => message.ruleId)).toContain(rule);
});

test("spacing fixes remain stable after Prettier formatting", async () => {
  const source = "function f() { work(); return 1; }";
  const result = linter.verifyAndFix(source, config);

  expect(result.fixed).toBe(true);
  expect(result.messages).toEqual([]);

  const formatted = await format(result.output, { parser: "babel" });

  expect(linter.verify(formatted, config)).toEqual([]);
});
