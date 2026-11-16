import { halls, portals } from "../../../shared/catalog";
import type { Hall, Point, Portal } from "../../../shared/types";
import {
  distance,
  localToWorld,
  normalize,
  sideWorld,
  sub,
  worldToLocal,
  insideObstacle,
} from "./transform";

export const BODY_RADIUS = 0.32;

export interface Corridor {
  portal: Portal;
  /** Threshold on side A, in world space (on the wall). */
  a: Point;
  /** Threshold on side B, in world space (on the wall). */
  b: Point;
  radius: number;
  elevationA: number;
  elevationB: number;
  scaleA: number;
  scaleB: number;
  /** Unit direction from a to b. */
  dir: Point;
  length: number;
}

function buildCorridor(portal: Portal): Corridor | null {
  const hallA = halls.find((h) => h.id === portal.a.hallId);
  const hallB = halls.find((h) => h.id === portal.b.hallId);
  if (!hallA || !hallB) return null;
  const a = sideWorld(hallA, portal.a);
  const b = sideWorld(hallB, portal.b);
  const length = distance(a, b);
  if (length < 0.1) return null;
  return {
    portal,
    a,
    b,
    // Fit inside the narrower doorway, minus the visitor's body.
    radius: Math.min(portal.a.width, portal.b.width) / 2 - BODY_RADIUS,
    elevationA: hallA.elevation,
    elevationB: hallB.elevation,
    scaleA: hallA.scale,
    scaleB: hallB.scale,
    dir: normalize(sub(b, a)),
    length,
  };
}

export const corridors: Corridor[] = portals
  .filter((p) => !p.closed)
  .map(buildCorridor)
  .filter((c): c is Corridor => !!c);

export type WalkRegion =
  | { kind: "hall"; hall: Hall; local: Point }
  | { kind: "corridor"; corridor: Corridor; t: number };

const smoothstep = (t: number) => t * t * (3 - 2 * t);

/** Distance from p to the corridor's threshold-to-threshold segment. */
function corridorProjection(
  c: Corridor,
  p: Point,
): { t: number; distance: number } {
  const rel = sub(p, c.a);
  const raw = rel.x * c.dir.x + rel.z * c.dir.z;
  const t = Math.max(0, Math.min(c.length, raw));
  const nearest = {
    x: c.a.x + c.dir.x * t,
    z: c.a.z + c.dir.z * t,
  };
  return { t: t / c.length, distance: distance(p, nearest) };
}

/**
 * The walkable area is the union of hall interiors and open corridors. A
 * corridor is a capsule from one threshold to the other, so its end caps
 * reach just inside each room through the doorway: walking out of a hall and
 * into a corridor (or the reverse) never hits an invisible seam.
 */
export function regionAt(p: Point): WalkRegion | null {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) return null;
  for (const hall of halls) {
    const local = worldToLocal(hall, p);
    if (
      local.x >= hall.bounds.minX &&
      local.x <= hall.bounds.maxX &&
      local.z >= hall.bounds.minZ &&
      local.z <= hall.bounds.maxZ &&
      !insideObstacle(hall, local, BODY_RADIUS / hall.scale)
    ) {
      return { kind: "hall", hall, local };
    }
  }
  for (const corridor of corridors) {
    const { t, distance: d } = corridorProjection(corridor, p);
    if (d <= corridor.radius) return { kind: "corridor", corridor, t };
  }
  return null;
}

export const isWalkable = (p: Point) => !!regionAt(p);

/** The corridor the walker is standing in, if any. */
export function corridorAt(p: Point): Corridor | null {
  const r = regionAt(p);
  return r?.kind === "corridor" ? r.corridor : null;
}

/** The hall that contains the point, or null when in a corridor. */
export function hallAt(p: Point): Hall | null {
  const r = regionAt(p);
  return r?.kind === "hall" ? r.hall : null;
}

export function elevationAt(p: Point): number {
  const r = regionAt(p);
  if (!r) return 0;
  if (r.kind === "hall") return r.hall.elevation;
  const c = r.corridor;
  const k = smoothstep(r.t);
  return c.elevationA + (c.elevationB - c.elevationA) * k;
}

export function scaleAt(p: Point): number {
  const r = regionAt(p);
  if (!r) return 1;
  if (r.kind === "hall") return r.hall.scale;
  const c = r.corridor;
  const k = smoothstep(r.t);
  return c.scaleA + (c.scaleB - c.scaleA) * k;
}

/** True when the straight line stays inside walkable space (sampled). */
export function pathIsWalkable(a: Point, b: Point): boolean {
  if (!isWalkable(a) || !isWalkable(b)) return false;
  const d = distance(a, b);
  const steps = Math.max(2, Math.ceil(d / 0.12));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (!isWalkable({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }))
      return false;
  }
  return true;
}

/**
 * Move one step towards a target, sliding along walls instead of stopping.
 * The result is always inside the walkable union.
 */
export function stepTowards(from: Point, to: Point, maxStep: number): Point {
  const d = distance(from, to);
  if (d < 1e-4) return from;
  const k = Math.min(1, maxStep / d);
  const candidate = {
    x: from.x + (to.x - from.x) * k,
    z: from.z + (to.z - from.z) * k,
  };
  if (isWalkable(candidate)) return candidate;
  const slideAlongX = { x: candidate.x, z: from.z };
  if (isWalkable(slideAlongX)) return slideAlongX;
  const slideAlongZ = { x: from.x, z: candidate.z };
  if (isWalkable(slideAlongZ)) return slideAlongZ;
  // Try a small fan of directions so corners do not trap the walker.
  for (let i = 1; i <= 6; i++) {
    const angle = (i / 6) * Math.PI * 0.5;
    const dx = candidate.x - from.x;
    const dz = candidate.z - from.z;
    for (const sign of [-1, 1]) {
      const rotated = {
        x: dx * Math.cos(angle) - dz * sign * Math.sin(angle),
        z: dx * sign * Math.sin(angle) + dz * Math.cos(angle),
      };
      const q = { x: from.x + rotated.x, z: from.z + rotated.z };
      if (isWalkable(q)) return q;
    }
  }
  return from;
}

/** A safe point inside a hall, used for spawns and recovery. */
export function safeStandingPoint(hall: Hall, p?: Point | null): Point {
  if (p && Number.isFinite(p.x) && Number.isFinite(p.z)) {
    const local = worldToLocal(hall, p);
    const clamped = {
      x: Math.max(hall.bounds.minX, Math.min(hall.bounds.maxX, local.x)),
      z: Math.max(hall.bounds.minZ, Math.min(hall.bounds.maxZ, local.z)),
    };
    if (!insideObstacle(hall, clamped, BODY_RADIUS / hall.scale))
      return localToWorld(hall, clamped);
  }
  return localToWorld(hall, hall.spawn);
}

export interface RestoredPose {
  position: Point;
  yaw: number;
  hallId: string | null;
}

/**
 * Recover a saved pose after a refresh. Stored coordinates are only a hint:
 * they are re-validated against the current geometry, so a stale pose — or a
 * hall transform changed by a new build — can never restore inside a wall.
 */
export function restorePose(raw: unknown): RestoredPose | null {
  if (!raw || typeof raw !== "object") return null;
  const pose = raw as { x?: unknown; z?: unknown; yaw?: unknown };
  if (typeof pose.x !== "number" || typeof pose.z !== "number") return null;
  if (!Number.isFinite(pose.x) || !Number.isFinite(pose.z)) return null;
  const position = { x: pose.x, z: pose.z };
  const region = regionAt(position);
  if (!region) return null;
  return {
    position,
    yaw:
      typeof pose.yaw === "number" && Number.isFinite(pose.yaw)
        ? pose.yaw
        : 0,
    hallId: region.kind === "hall" ? region.hall.id : null,
  };
}
