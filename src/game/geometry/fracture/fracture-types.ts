export type Point = { x: number; y: number };
export type Polygon = Point[];
export type Edge = { a: Point; b: Point; low: number; high: number };
export type Interval = { left: Edge; right: Edge };

interface Bounds {
  left: number;
  right: number;
  bottom: number;
  top: number;
}
export interface MaskOptions {
  side: number;
  seed: number;
  bounds: Bounds;
}
export interface GeometryOptions {
  depth: number;
  offset: Point;
  size: { width: number; height: number };
}
interface HoleBand {
  edges: Edge[];
  low: number;
  high: number;
}
export interface Sweep {
  regions: Polygon[];
  holes: Polygon[];
  regionEdges: Edge[][];
  holeBands: HoleBand[];
  allEdges: Edge[];
  cuts: number[];
}
export type Strip = Interval & { y0: number; y1: number };
