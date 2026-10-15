// Cover only import forms that Oxlint's native no-restricted-imports skips.
export const importSyntax = [
  {
    selector: "TSImportType[argument.literal.value=/^\\./]",
    message:
      "Use a #root/... project-root import instead of a relative import.",
  },
  {
    selector: "CallExpression[callee.name='require'][arguments.0.value=/^\\./]",
    message:
      "Use a #root/... project-root import instead of a relative import.",
  },
  {
    selector:
      ":matches(ImportExpression:not([source.type='Literal']), CallExpression[callee.name='require']:not([arguments.0.type='Literal']))",
    message:
      "Use a literal import path so project-root imports can be checked statically.",
  },
];
