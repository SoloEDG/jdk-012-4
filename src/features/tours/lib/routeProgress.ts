import { routeById } from "../../../shared/catalog";
import type { TourState } from "../../../shared/types";

export function tourRoute(t: TourState) {
  return routeById(t.routeId);
}
export function tourTarget(t: TourState): string | null {
  return tourRoute(t)?.stops[t.step] || null;
}
export function tourProgress(t: TourState): number {
  const r = tourRoute(t);
  if (!r) return 0;
  if (t.phase === "done") return 1;
  return t.step / r.stops.length;
}
