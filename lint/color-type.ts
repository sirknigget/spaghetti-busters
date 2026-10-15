import {
  ESLintUtils,
  type TSESLint,
  type TSESTree,
} from "@typescript-eslint/utils";

export type ColorTypeDetector = (node: TSESTree.Node) => boolean;

/** Recognize Three.js Color receivers even when a local alias has no color-like name. */
export function colorTypeDetector(
  context: TSESLint.RuleContext<"palette", []>,
): ColorTypeDetector {
  const services = ESLintUtils.getParserServices(context, true);
  const checker = services.program?.getTypeChecker();

  return (node) => {
    const original = services.esTreeNodeToTSNodeMap.get(node);
    const symbol = checker?.getTypeAtLocation(original).getSymbol();

    return symbol?.getName() === "Color";
  };
}
