import type { Hall, Placement, Point, PortalSide } from "../../../shared/types";

/**
 * Three.js applies rotation.y = φ to a local (x, z) vector as below.
 * Everything in the app that turns a hall-local direction must use this.
 */
export function rotate(p: Point, angle: number): Point {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: p.x * c + p.z * s, z: -p.x * s + p.z * c };
}

/** A wall-hung artwork faces along (sin φ, cos φ), matching rotation.y = φ. */
export const facingDir = (facing: number): Point => ({
  x: Math.sin(facing),
  z: Math.cos(facing),
});

/** Camera with rotation.y = yaw looks along this direction. */
export const cameraForward = (yaw: number): Point => ({
  x: -Math.sin(yaw),
  z: -Math.cos(yaw),
});
export const cameraRight = (yaw: number): Point => ({
  x: Math.cos(yaw),
  z: -Math.sin(yaw),
});
/** Camera yaw that makes the camera look along `dir`. */
export const yawLookingAt = (dir: Point): number =>
  Math.atan2(-dir.x, -dir.z);

/** Hall-local point → shared world plan. */
export function localToWorld(hall: Hall, p: Point): Point {
  const scaled = { x: p.x * hall.scale, z: p.z * hall.scale };
  const turned = rotate(scaled, hall.rotation);
  return { x: hall.origin.x + turned.x, z: hall.origin.z + turned.z };
}

/** Shared world plan → hall-local point. */
export function worldToLocal(hall: Hall, p: Point): Point {
  const turned = rotate(
    { x: p.x - hall.origin.x, z: p.z - hall.origin.z },
    -hall.rotation,
  );
  return { x: turned.x / hall.scale, z: turned.z / hall.scale };
}

/** Directions ignore a hall's origin and scale. */
export const localDirToWorld = (hall: Hall, dir: Point): Point =>
  rotate(dir, hall.rotation);
/** Where a visitor stands to look at a hanging. */
export function viewingPointOf(p: Placement): Point {
  const dir = facingDir(p.facing);
  return {
    x: p.position.x + dir.x * 2.2,
    z: p.position.z + dir.z * 2.2,
  };
}

export function hallCorners(hall: Hall): Point[] {
  const w = hall.width / 2;
  const d = hall.depth / 2;
  return [
    { x: -w, z: -d },
    { x: w, z: -d },
    { x: w, z: d },
    { x: -w, z: d },
  ].map((p) => localToWorld(hall, p));
}

/** Clamp a local point into the hall's walkable rectangle. */
export function clampToBounds(hall: Hall, p: Point): Point {
  return {
    x: Math.max(hall.bounds.minX, Math.min(hall.bounds.maxX, p.x)),
    z: Math.max(hall.bounds.minZ, Math.min(hall.bounds.maxZ, p.z)),
  };
}

/** True when a local point overlaps a solid obstacle plus a body radius. */
export function insideObstacle(hall: Hall, p: Point, pad = 0): boolean {
  const o = hall.obstacle;
  if (!o) return false;
  return (
    p.x > o.minX - pad &&
    p.x < o.maxX + pad &&
    p.z > o.minZ - pad &&
    p.z < o.maxZ + pad
  );
}

export function worldPlanBounds(halls: Hall[]) {
  const points = halls.flatMap(hallCorners);
  return {
    minX: Math.min(...points.map((p) => p.x)),
    maxX: Math.max(...points.map((p) => p.x)),
    minZ: Math.min(...points.map((p) => p.z)),
    maxZ: Math.max(...points.map((p) => p.z)),
  };
}

export const sideWorld = (hall: Hall, side: PortalSide): Point =>
  localToWorld(hall, side.position);
export const sideNormalWorld = (hall: Hall, side: PortalSide): Point =>
  localDirToWorld(hall, side.normal);
export const dot = (a: Point, b: Point) => a.x * b.x + a.z * b.z;
export const sub = (a: Point, b: Point): Point => ({
  x: a.x - b.x,
  z: a.z - b.z,
});
export const add = (a: Point, b: Point): Point => ({
  x: a.x + b.x,
  z: a.z + b.z,
});
export const scale = (p: Point, k: number): Point => ({
  x: p.x * k,
  z: p.z * k,
});
export const length = (p: Point) => Math.hypot(p.x, p.z);
export const normalize = (p: Point): Point => {
  const l = length(p) || 1;
  return { x: p.x / l, z: p.z / l };
};
export const distance = (a: Point, b: Point) => length(sub(a, b));
