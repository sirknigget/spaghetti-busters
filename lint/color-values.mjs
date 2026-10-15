import { Color } from "three";
import { fileURLToPath } from "node:url";

export const PALETTE_FILE = fileURLToPath(
  new URL("../src/game/palette.ts", import.meta.url),
);
export const CSS_PALETTE_FILE = fileURLToPath(
  new URL("../src/palette.css", import.meta.url),
);
const HEX_COLOR = /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;
const COLOR_FUNCTION =
  /^(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color(?:-mix)?|device-cmyk|light-dark|contrast-color)\s*\(/i;
const COLOR_FUNCTION_NAME =
  /^(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color(?:-mix)?|device-cmyk|light-dark|contrast-color)$/i;

/** @param {string} value */
export function isColorValue(value) {
  const text = value.trim();

  return HEX_COLOR.test(text) || COLOR_FUNCTION.test(text);
}

/** @param {string} value */
export function isColorFunction(value) {
  return COLOR_FUNCTION_NAME.test(value);
}

/** @param {string} value */
export function isNamedColor(value) {
  const text = value.trim().toLowerCase();

  return text === "transparent" || Object.hasOwn(Color.NAMES, text);
}
