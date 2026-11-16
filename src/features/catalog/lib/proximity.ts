import { halls, placementsInHall, portalById } from "../../../shared/catalog";
import type { Hall, Point } from "../../../shared/types";
import { hallAt } from "../../space/lib/geometry";
import { distance, viewingPointOf } from "../../space/lib/transform";

export const NEARBY_RADIUS = 3.1;

export interface NearbyInfo {
  placementId: string;
  hall: Hall;
  /** Distance from the walker to the standing spot, in local units. */
  distance: number;
}

/**
 * Proximity is evaluated per hall in that hall's own local space, so a work
 * in a neighbouring (rotated, scaled) hall can never be "near" just because
 * footprints overlap in the world plan.
 */
export function nearbyPlacement(p: Point): NearbyInfo | null {
  const hall = hallAt(p);
  if (!hall) return null;
  let best: NearbyInfo | null = null;
  for (const placement of placementsInHall(hall.id)) {
    const stand = viewingPointOf(placement);
    const d = distance(stand, p);
    if (d < NEARBY_RADIUS && (!best || d < best.distance)) {
      best = { placementId: placement.id, hall, distance: d };
    }
  }
  return best;
}

/** Human-readable reason a doorway cannot be used right now. */
export function portalStatus(hall: Hall, portalId: string): string | null {
  const portal = portalById(portalId);
  if (!portal) return null;
  if (portal.closed) return portal.note || "通道暂时关闭";
  if (halls.every((h) => h.id !== portal.a.hallId && h.id !== portal.b.hallId))
    return "通道不可用";
  return null;
}
