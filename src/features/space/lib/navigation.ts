import {
  halls,
  placementById,
  placements,
  portals,
} from "../../../shared/catalog";
import type { Hall, Point } from "../../../shared/types";
import {
  BODY_RADIUS,
  corridors,
  isWalkable,
  pathIsWalkable,
  regionAt,
  safeStandingPoint,
} from "./geometry";
import {
  clampToBounds,
  distance,
  insideObstacle,
  localToWorld,
  sideWorld,
  viewingPointOf,
  worldToLocal,
} from "./transform";

export interface PathPlan {
  points: Point[];
  targetPlacementId: string;
  targetHallId: string;
  /** Halls the planned route passes through, in walking order. */
  hallIds: string[];
}

interface Node {
  id: string;
  point: Point;
  hallId: string | null;
}

function obstacleCorners(hall: Hall): Point[] {
  const o = hall.obstacle;
  if (!o) return [];
  const m = 0.8;
  return [
    { x: o.minX - m, z: o.minZ - m },
    { x: o.maxX + m, z: o.minZ - m },
    { x: o.minX - m, z: o.maxZ + m },
    { x: o.maxX + m, z: o.maxZ + m },
  ].map((p) => clampToBounds(hall, p));
}

/** Threshold plus a small step into the room, used as a graph waypoint. */
function portalInnerPoint(hall: Hall, position: Point, normal: Point): Point {
  const inset = (BODY_RADIUS + 0.55) / hall.scale;
  return localToWorld(
    hall,
    clampToBounds(hall, {
      x: position.x + normal.x * inset,
      z: position.z + normal.z * inset,
    }),
  );
}

function buildNodes(): Node[] {
  const nodes: Node[] = [];
  for (const hall of halls) {
    const add = (id: string, local: Point) => {
      const clamped = clampToBounds(hall, local);
      const point = localToWorld(hall, clamped);
      if (!isWalkable(point)) return;
      nodes.push({ id: `${hall.id}:${id}`, point, hallId: hall.id });
    };
    add("spawn", hall.spawn);
    for (const placement of placements.filter((p) => p.hallId === hall.id))
      add(`placement:${placement.id}`, viewingPointOf(placement));
    obstacleCorners(hall).forEach((corner, i) => add(`corner:${i}`, corner));
    for (const portal of portals) {
      if (portal.closed) continue;
      if (portal.a.hallId === hall.id)
        add(`portal:${portal.id}`, portalInnerPoint(hall, portal.a.position, portal.a.normal));
      if (portal.b.hallId === hall.id)
        add(`portal:${portal.id}`, portalInnerPoint(hall, portal.b.position, portal.b.normal));
    }
  }
  // The thresholds themselves are walkable through the corridor capsule; add
  // them so a path can hug the cabling between halls.
  for (const portal of portals) {
    if (portal.closed) continue;
    for (const side of [portal.a, portal.b]) {
      const hall = halls.find((h) => h.id === side.hallId);
      if (!hall) continue;
      const point = sideWorld(hall, side);
      if (isWalkable(point))
        nodes.push({
          id: `threshold:${portal.id}:${side.hallId}`,
          point,
          hallId: null,
        });
    }
  }
  return nodes;
}

const nodeList = buildNodes();
const nodeById = new Map(nodeList.map((n) => [n.id, n]));

/**
 * Which portal (if any) a straight walkable segment actually passes through.
 * A segment may only cross walkable space by using one of the corridors, so
 * this identifies the doorway rather than merely comparing hall ids.
 */
function portalsOnSegment(a: Point, b: Point): string[] {
  const found = new Set<string>();
  const steps = Math.max(2, Math.ceil(distance(a, b) / 0.25));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const region = regionAt({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
    if (region?.kind === "corridor") found.add(region.corridor.portal.id);
  }
  return [...found];
}

interface Graph {
  adjacency: Map<string, { to: string; cost: number }[]>;
}

function connect(nodes: Node[], blocked: Set<string>): Graph {
  const adjacency = new Map<string, { to: string; cost: number }[]>();
  const link = (a: string, b: string, cost: number) => {
    if (!adjacency.has(a)) adjacency.set(a, []);
    if (!adjacency.has(b)) adjacency.set(b, []);
    adjacency.get(a)!.push({ to: b, cost });
    adjacency.get(b)!.push({ to: a, cost });
  };
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const d = distance(a.point, b.point);
      if (d > 26) continue;
      if (!pathIsWalkable(a.point, b.point)) continue;
      // A doorway the visitor just stepped through stays shut for planning
      // purposes until they walk clear of it.
      if (blocked.size && portalsOnSegment(a.point, b.point).some((id) => blocked.has(id)))
        continue;
      link(a.id, b.id, d);
    }
  }
  return { adjacency };
}

const graphCache = new Map<string, Graph>();
function graphWith(blocked: Set<string>): Graph {
  const key = [...blocked].sort().join(",");
  const cached = graphCache.get(key);
  if (cached) return cached;
  const graph = connect(nodeList, blocked);
  graphCache.set(key, graph);
  return graph;
}

function dijkstra(
  startId: string,
  targetId: string,
  adjacency: Map<string, { to: string; cost: number }[]>,
) {
  const dist = new Map<string, number>([[startId, 0]]);
  const prev = new Map<string, string>();
  const visited = new Set<string>();
  const queue = new Set<string>([startId]);
  while (queue.size) {
    let current: string | null = null;
    for (const id of queue) {
      if (current === null || (dist.get(id) ?? Infinity) < (dist.get(current) ?? Infinity))
        current = id;
    }
    if (current === null) break;
    queue.delete(current);
    visited.add(current);
    if (current === targetId) break;
    for (const edge of adjacency.get(current) || []) {
      if (visited.has(edge.to)) continue;
      const candidate = (dist.get(current) ?? Infinity) + edge.cost;
      if (candidate < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, candidate);
        prev.set(edge.to, current);
        queue.add(edge.to);
      }
    }
  }
  if (!dist.has(targetId)) return null;
  const chain: string[] = [];
  let cursor: string | undefined = targetId;
  while (cursor) {
    chain.push(cursor);
    cursor = prev.get(cursor);
  }
  return chain.reverse();
}

/** Remove waypoints that can be seen past, making walks feel natural. */
function smooth(points: Point[]): Point[] {
  if (points.length < 3) return points;
  const out: Point[] = [points[0]];
  let anchor = 0;
  for (let i = 2; i < points.length; i++) {
    if (!pathIsWalkable(points[anchor], points[i])) {
      out.push(points[i - 1]);
      anchor = i - 1;
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

/**
 * Hysteresis for doorways: a portal the visitor is still standing next to is
 * "hot". Reversing through it immediately would read as being bounced back,
 * so the planner prefers any other way round until the visitor has walked
 * clear into the room. This is the switching boundary between continuous
 * walking (one space) and cycle-free guidance (a fresh route).
 */
export const PORTAL_REARM_DISTANCE = 1.6;

export function hotPortals(from: Point): string[] {
  const hot: string[] = [];
  for (const corridor of corridors) {
    if (
      distance(from, corridor.a) <= PORTAL_REARM_DISTANCE ||
      distance(from, corridor.b) <= PORTAL_REARM_DISTANCE
    )
      hot.push(corridor.portal.id);
  }
  return hot;
}

/**
 * Plan a walk to a placement. Returns null when no connected route exists —
 * for example a hanging in a hall whose only doorway is closed — so the
 * caller can leave the visitor exactly where they stand and explain why.
 */
export function planToPlacement(
  from: Point,
  placementId: string,
): PathPlan | null {
  const placement = placementById(placementId);
  if (!placement) return null;
  const hall = halls.find((h) => h.id === placement.hallId);
  if (!hall) return null;
  const targetLocal = viewingPointOf(placement);
  if (insideObstacle(hall, targetLocal, BODY_RADIUS / hall.scale)) return null;
  const targetPoint = localToWorld(hall, targetLocal);
  if (!isWalkable(targetPoint)) return null;

  const region = regionAt(from);
  if (!region) return null;

  const startId = "start";
  // Only the doorways the visitor is still standing beside are held shut for
  // planning; everything else is a normal edge. The visitor can always walk
  // back through it manually — this only shapes the suggested route.
  const hot = hotPortals(from);
  const graph = graphWith(new Set(hot));
  const adjacency = new Map<string, { to: string; cost: number }[]>();
  for (const [id, edges] of graph.adjacency) adjacency.set(id, [...edges]);
  const linkStart = (to: string, cost: number) => {
    if (!adjacency.has(startId)) adjacency.set(startId, []);
    if (!adjacency.has(to)) adjacency.set(to, []);
    adjacency.get(startId)!.push({ to, cost });
    adjacency.get(to)!.push({ to: startId, cost });
  };
  if (region.kind === "hall") {
    for (const node of nodeList) {
      if (node.hallId && node.hallId !== region.hall.id) continue;
      if (hot.length && portalsOnSegment(from, node.point).some((id) => hot.includes(id)))
        continue;
      if (pathIsWalkable(from, node.point)) linkStart(node.id, distance(from, node.point));
    }
  } else {
    const portal = region.corridor.portal;
    for (const side of [portal.a, portal.b]) {
      const node = nodeById.get(`threshold:${portal.id}:${side.hallId}`);
      if (node && pathIsWalkable(from, node.point))
        linkStart(node.id, distance(from, node.point));
    }
    for (const node of nodeList) {
      if (pathIsWalkable(from, node.point) && distance(from, node.point) < 4)
        linkStart(node.id, distance(from, node.point));
    }
  }

  // Best target node: the placement's own node, or any node in the same hall
  // when the exact viewing point is not itself a graph node.
  const candidates = nodeList
    .filter((n) => n.hallId === hall.id)
    .map((n) => ({ id: n.id, point: n.point, isTarget: n.id === `${hall.id}:placement:${placement.id}` }))
    .sort((a, b) => Number(b.isTarget) - Number(a.isTarget));

  let best: { chain: string[]; cost: number } | null = null;
  for (const candidate of candidates) {
    const chain = dijkstra(startId, candidate.id, adjacency);
    if (!chain) continue;
    let cost = 0;
    let previous = from;
    for (const id of chain) {
      const node = id === startId ? null : nodeById.get(id);
      const point = node?.point || previous;
      cost += distance(previous, point);
      previous = point;
    }
    cost += distance(previous, targetPoint);
    if (!pathIsWalkable(previous, targetPoint) && !candidate.isTarget) continue;
    if (!best || cost < best.cost) best = { chain, cost };
    if (candidate.isTarget && chain) break;
  }
  const direct = region.kind === "hall" && region.hall.id === hall.id && pathIsWalkable(from, targetPoint);
  if (!best && !direct) return null;

  const chainIds = best?.chain || [];
  const points: Point[] = [];
  const hallIds: string[] = [];
  for (const id of chainIds) {
    if (id === startId) continue;
    const node = nodeById.get(id);
    if (!node) continue;
    if (!points.length || distance(points[points.length - 1], node.point) > 0.05)
      points.push(node.point);
    if (node.hallId && hallIds[hallIds.length - 1] !== node.hallId)
      hallIds.push(node.hallId);
  }
  if (!points.length || distance(points[points.length - 1], targetPoint) > 0.05)
    points.push(targetPoint);
  const route = smooth(points);
  if (!hallIds.includes(hall.id)) hallIds.push(hall.id);
  return {
    points: route,
    targetPlacementId: placement.id,
    targetHallId: hall.id,
    hallIds,
  };
}

/** Whether a hanging can be reached at all from its own hall's spawn. */
export function isPlacementReachable(placementId: string): boolean {
  const placement = placementById(placementId);
  if (!placement) return false;
  const hall = halls.find((h) => h.id === placement.hallId);
  if (!hall) return false;
  return !!planToPlacement(safeStandingPoint(hall), placementId);
}
