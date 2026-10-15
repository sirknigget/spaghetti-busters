import type { TSESTree } from "@typescript-eslint/utils";
import type { ColorTypeDetector } from "./color-type";

const COLOR_FIELD =
  /(?:colors?)$|^(?:tint|background|fill|fillStyle|stroke|strokeStyle|emissive|specular)$/i;
const COLOR_CONSTRUCTORS = new Set([
  "Color",
  "Fog",
  "FogExp2",
  "AmbientLight",
  "DirectionalLight",
  "HemisphereLight",
  "PointLight",
  "SpotLight",
  "RectAreaLight",
  "Light",
]);
const COLOR_METHODS = new Set([
  "setHex",
  "setRGB",
  "setHSL",
  "setStyle",
  "setColor",
  "setClearColor",
]);
const RGB_COMPONENTS = 3;
const FIRST_ARGUMENT = 0;
const SECOND_ARGUMENT = 1;
const COLOR_WRAPPERS = new Set([
  "ConditionalExpression",
  "LogicalExpression",
  "ArrayExpression",
  "TSAsExpression",
  "TSSatisfiesExpression",
  "TSNonNullExpression",
  "ChainExpression",
]);

export function memberName(node: TSESTree.Node): string | undefined {
  if (node.type === "Identifier") {
    return node.name;
  }
  if (node.type === "Literal" && typeof node.value === "string") {
    return node.value;
  }
  if (node.type === "MemberExpression") {
    return memberName(node.property);
  }

  return undefined;
}

function argumentPosition(
  node: TSESTree.CallExpression | TSESTree.NewExpression,
  child: TSESTree.Node,
) {
  for (const [position, argument] of node.arguments.entries()) {
    if (argument === child) {
      return position;
    }
  }

  return -1;
}

function constructorColor(node: TSESTree.NewExpression, child: TSESTree.Node) {
  const name = memberName(node.callee);
  if (!name || !COLOR_CONSTRUCTORS.has(name)) {
    return false;
  }
  const count = name === "Color" ? RGB_COMPONENTS : FIRST_ARGUMENT + 1;
  const position = argumentPosition(node, child);

  return (
    position >= FIRST_ARGUMENT &&
    (position < count ||
      (name === "HemisphereLight" && position === SECOND_ARGUMENT))
  );
}

function callColor(
  node: TSESTree.CallExpression,
  child: TSESTree.Node,
  colorType: ColorTypeDetector,
) {
  if (node.callee.type !== "MemberExpression") {
    return false;
  }
  const name = memberName(node.callee.property);
  const position = argumentPosition(node, child);
  if (name === "addColorStop") {
    return position === SECOND_ARGUMENT;
  }
  if (name && COLOR_METHODS.has(name)) {
    const count = name === "setRGB" || name === "setHSL" ? RGB_COMPONENTS : 1;

    return position >= FIRST_ARGUMENT && position < count;
  }
  const receiver = node.callee.object;
  const receiverName = memberName(receiver);
  const color =
    (!!receiverName && COLOR_FIELD.test(receiverName)) || colorType(receiver);
  const constructed =
    receiver.type === "NewExpression" &&
    memberName(receiver.callee) === "Color";

  const validPosition = position >= FIRST_ARGUMENT && position < RGB_COMPONENTS;

  return name === "set" && (color || constructed) && validPosition;
}

function parentColor(
  parent: TSESTree.Node,
  child: TSESTree.Node,
  colorType: ColorTypeDetector,
) {
  if (
    parent.type === "Property" ||
    parent.type === "PropertyDefinition" ||
    parent.type === "AccessorProperty"
  ) {
    const name = memberName(parent.key);

    return child === parent.value && !!name && COLOR_FIELD.test(name);
  }
  if (parent.type === "AssignmentExpression") {
    const name = memberName(parent.left);

    return child === parent.right && !!name && COLOR_FIELD.test(name);
  }
  if (parent.type === "VariableDeclarator") {
    const name = memberName(parent.id);

    return !!name && /(?:colors?|tint|palette)$/i.test(name);
  }
  if (parent.type === "NewExpression") {
    return constructorColor(parent, child);
  }

  return (
    parent.type === "CallExpression" && callColor(parent, child, colorType)
  );
}

/** Follow wrappers and conditional branches, without treating unrelated object fields as colors. */
export function isColorContext(
  node: TSESTree.Node,
  colorType: ColorTypeDetector = () => false,
): boolean {
  let child = node;
  while (child.parent) {
    const parent = child.parent;
    if (parentColor(parent, child, colorType)) {
      return true;
    }
    if (!COLOR_WRAPPERS.has(parent.type)) {
      return false;
    }
    child = parent;
  }

  return false;
}
