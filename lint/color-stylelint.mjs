import { resolve } from "node:path";
import stylelint from "stylelint";
import valueParser from "postcss-value-parser";
import {
  CSS_PALETTE_FILE,
  isColorValue,
  isColorFunction,
  isNamedColor,
} from "./color-values.mjs";

const ruleName = "strict-colors/no-literals";
const messages = stylelint.utils.ruleMessages(ruleName, {
  rejected: "Use a named color variable defined in src/palette.css.",
});
const COLOR_PROPERTY =
  /(?:color$)|^(?:--|background|border|outline|fill$|stroke$|box-shadow$|text-shadow$|column-rule|filter$|text-decoration|text-emphasis)/i;

/** @param {import('postcss').Declaration} declaration */
function permitsNamedColor(declaration) {
  return (
    COLOR_PROPERTY.test(declaration.prop) ||
    /(?:repeating-)?(?:linear|radial|conic)-gradient\(/i.test(declaration.value)
  );
}

/** @param {import('postcss').Declaration} declaration */
function isPaletteDefinition(declaration) {
  const filename = declaration.source?.input.file;

  return (
    filename &&
    resolve(filename) === CSS_PALETTE_FILE &&
    declaration.prop.startsWith("--")
  );
}

/** @param {import('postcss').Declaration} declaration */
function forbiddenValues(declaration) {
  const values = [];
  valueParser(declaration.value).walk((node) => {
    if (node.type === "function" && node.value.toLowerCase() === "url") {
      return false;
    }
    if (node.type === "function" && isColorFunction(node.value)) {
      values.push(node);

      return false;
    }
    if (
      node.type === "word" &&
      (isColorValue(node.value) ||
        (permitsNamedColor(declaration) && isNamedColor(node.value)))
    ) {
      values.push(node);
    }

    return undefined;
  });

  return values;
}

/** @type {import('stylelint').Rule} */
const rule = (primary) => (root, result) => {
  if (!stylelint.utils.validateOptions(result, ruleName, { actual: primary })) {
    return;
  }
  root.walkDecls((declaration) => {
    if (isPaletteDefinition(declaration)) {
      return;
    }
    for (const value of forbiddenValues(declaration)) {
      stylelint.utils.report({
        ruleName,
        result,
        node: declaration,
        message: messages.rejected,
        word: value.value,
      });
    }
  });
};

rule.ruleName = ruleName;
rule.messages = messages;
export default stylelint.createPlugin(ruleName, rule);
