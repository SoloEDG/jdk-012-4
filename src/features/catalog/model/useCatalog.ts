import { useState } from "react";
import { placementById } from "../../../shared/catalog";
import type { Point } from "../../../shared/types";
import { nearbyPlacement } from "../lib/proximity";

export function useCatalog() {
  /**
   * `active` is a placement (a hanging), not an artwork: the same work in
   * two halls is two distinct viewing contexts. Details, favourites and
   * notes resolve through placement → artwork.
   */
  const [active, setActive] = useState<string | null>("pa1-main");
  const [nearby, setNearby] = useState<string | null>(null);
  return {
    active,
    nearby,
    select: setActive,
    observe: (p: Point) => {
      const found = nearbyPlacement(p);
      setNearby(found?.placementId ?? null);
      if (found) setActive(found.placementId);
    },
    /** Clear the nearby highlight without changing the open detail. */
    reset: () => setNearby(null),
    activeArtworkId: placementById(active)?.artworkId ?? null,
  };
}
