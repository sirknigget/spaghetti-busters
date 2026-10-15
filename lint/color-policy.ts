import { resolve } from "node:path";
import type { TSESLint, TSESTree } from "@typescript-eslint/utils";
import { PALETTE_FILE, isColorValue, isNamedColor } from "./color-values.mjs";
import { isColorContext } from "./color-context";
import { colorTypeDetector, type ColorTypeDetector } from "./color-type";

function dynamicHexColor(
  node: TSESTree.TemplateLiteral,
  colorType: ColorTypeDetector,
) {
  return (
    node.expressions.length > 0 &&
    isColorContext(node, colorType) &&
    node.quasis.some((quasi) =>
      /^#[\da-f]*$/i.test(quasi.value.cooked ?? quasi.value.raw),
    )
  );
}

export const noColorLiterals: TSESLint.RuleModule<"palette"> = {
  meta: {
    type: "suggestion",
    docs: { description: "Keep literal colors in the dedicated palette." },
    schema: [],
    messages: { palette: "Use a named color from src/game/palette.ts." },
  },
  create(context) {
    if (resolve(context.filename) === PALETTE_FILE) {
      return {};
    }
    const colorType = colorTypeDetector(context);

    function check(node: TSESTree.Node, value: string | number) {
      const contextual = isColorContext(node, colorType);
      const literal =
        typeof value === "string"
          ? isColorValue(value) || (contextual && isNamedColor(value))
          : contextual;
      if (literal) {
        context.report({ node, messageId: "palette" });
      }
    }

    return {
      Literal(node) {
        if (typeof node.value === "string" || typeof node.value === "number") {
          check(node, node.value);
        }
      },
      TemplateLiteral(node) {
        if (dynamicHexColor(node, colorType)) {
          context.report({ node, messageId: "palette" });

          return;
        }
        for (const quasi of node.quasis) {
          check(node, quasi.value.cooked ?? quasi.value.raw);
        }
      },
    };
  },
};

export const colorPolicyPlugin = {
  rules: { "no-color-literals": noColorLiterals },
};
