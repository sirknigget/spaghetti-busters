/** @import { Context, ESTree, Rule } from "@oxlint/plugins" */
/** @param {Context} context
 * @param {ESTree.Node} source
 */
function checkSource(context, source) {
  if (source.type !== "Literal" || typeof source.value !== "string") {
    context.report({ node: source, messageId: "staticPath" });

    return;
  }

  if (source.value.startsWith(".")) {
    context.report({ node: source, messageId: "relativePath" });
  }
}

/** @type {Rule} */
export const rootImports = {
  meta: {
    type: "suggestion",
    schema: [],
    messages: {
      relativePath:
        "Use a #root/... project-root import instead of a relative import.",
      staticPath:
        "Use a literal import path so project-root imports can be checked statically.",
    },
  },
  create(context) {
    return {
      ImportDeclaration: (node) => checkSource(context, node.source),
      ExportAllDeclaration: (node) => checkSource(context, node.source),
      ExportNamedDeclaration(node) {
        if (node.source) {
          checkSource(context, node.source);
        }
      },
      ImportExpression: (node) => checkSource(context, node.source),
      TSImportType: (node) => checkSource(context, node.source),
      TSExternalModuleReference: (node) =>
        checkSource(context, node.expression),
      CallExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "require"
        ) {
          const [source] = node.arguments;

          if (source) {
            checkSource(context, source);
          }
        }
      },
    };
  },
};
