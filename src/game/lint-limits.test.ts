import { expect, test } from "vitest";
import { Linter } from "eslint";
import parser from "@typescript-eslint/parser";
import { limitRules } from "../../lint/limits";

const linter = new Linter();
const config = [
  {
    files: ["**/*.ts"],
    languageOptions: { parser },
    rules: limitRules,
  },
];

function violations(source: string, rule: string) {
  return linter
    .verify(source, config, { filename: "fixture.ts" })
    .filter((message) => message.ruleId === rule);
}

function functionWithLines(lines: number): string {
  return [
    "function work() {",
    ...Array<string>(lines - 2).fill("  tick();"),
    "}",
  ].join("\n");
}

test.each([40, 41])("function length boundary: %i", (lines) => {
  expect(
    violations(functionWithLines(lines), "max-lines-per-function"),
  ).toHaveLength(lines > 40 ? 1 : 0);
});

test.each([300, 301])("file length counts comments: %i", (lines) => {
  const source = Array<string>(lines)
    .fill("// Documentation counts too.")
    .join("\n");
  expect(violations(source, "max-lines")).toHaveLength(lines > 300 ? 1 : 0);
});

test("function length includes blank and comment lines", () => {
  const source = [
    "function work() {",
    ...Array<string>(39).fill(""),
    "// Comment",
    "}",
  ].join("\n");
  expect(violations(source, "max-lines-per-function")).toHaveLength(1);
});

test.each([
  "function f(a: number, b: number, c: number, d: number) {}",
  "class C { f(a: number, b: number, c: number, d: number) {} }",
  "const f = (a: number, b: number, c: number, d: number) => a;",
  "type F = (a: number, b: number, c: number, d: number) => void;",
])("rejects four function parameters: %s", (source) => {
  expect(violations(source, "max-params")).toHaveLength(1);
});

test.each([
  "interface I { f(a: number, b: number, c: number, d: number): void; }",
  "type T = { f(a: number, b: number, c: number, d: number): void };",
  "interface I { (a: number, b: number, c: number, d: number): void; }",
  "interface I { new(a: number, b: number, c: number, d: number): I; }",
  "type Constructor = new(a: number, b: number, c: number, d: number) => object;",
  "interface I { f(this: I, a: number, b: number, c: number, d: number): void; }",
])("rejects four signature parameters: %s", (source) => {
  expect(violations(source, "no-restricted-syntax")).toHaveLength(1);
});

test("accepts three parameters including a method signature", () => {
  const source = "interface I { f(a: number, b: number, c: number): void; }";
  expect(linter.verify(source, config, { filename: "fixture.ts" })).toEqual([]);
});

const memberContainers = [
  ["class C {", "}"],
  ["interface I {", "}"],
  ["type T = {", "};"],
];

test.each(memberContainers)("member boundaries: %s", (start, end) => {
  for (const count of [30, 31]) {
    const members = Array.from(
      { length: count },
      (_, i) => `field${i}: number;`,
    );
    const source = [start, ...members, end].join("\n");
    expect(violations(source, "no-restricted-syntax")).toHaveLength(
      count > 30 ? 1 : 0,
    );
  }
});

test("explicit this is not a runtime parameter in signatures", () => {
  const source =
    "interface I { f(this: I, a: number, b: number, c: number): void; }";
  expect(linter.verify(source, config, { filename: "fixture.ts" })).toEqual([]);
});
