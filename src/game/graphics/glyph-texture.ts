import * as THREE from "three";

const HALF = 0.5;

interface Glyph {
  char?: string;
  color: string;
}
interface GlyphStyle {
  width: number;
  height: number;
  font: string;
}

export function createGlyphTexture(glyph: Glyph, style: GlyphStyle) {
  const canvas = document.createElement("canvas");

  canvas.width = style.width;
  canvas.height = style.height;

  const context = canvas.getContext("2d")!;

  context.font = style.font;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = glyph.color;
  context.fillText(glyph.char!, canvas.width * HALF, canvas.height * HALF);

  const texture = new THREE.CanvasTexture(canvas);

  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}
