import { useEffect, useRef, useState } from "react";
import {
  useWalker,
  planToPlacement,
  hallAt,
  isPlacementReachable,
  safeStandingPoint,
  restorePose,
} from "../features/space";
import { useCatalog } from "../features/catalog";
import { useNarration } from "../features/narration";
import { useTour } from "../features/tours";
import { useCollection } from "../features/collection";
import {
  artworkById,
  hallById,
  placementById,
  placementsByArtwork,
  portalById,
} from "../shared/catalog";
import { savePose, loadPose, saveDocument } from "../shared/storage";
import { regionAt } from "../features/space/lib/geometry";
import { localToWorld, worldToLocal } from "../features/space/lib/transform";

export function useGallery() {
  const catalog = useCatalog();
  const tour = useTour();
  const collection = useCollection();
  const current = useRef({
    nearby: catalog.nearby,
    record: collection.record,
    enterHall: collection.enterHall,
    hallId: null as string | null,
    cameFromCorridor: false,
    tourPhase: tour.state.phase,
    target: tour.target,
    pauseTour: () => {},
  });
  const walker = useWalker(
    (p) => {
      catalog.observe(p);
      const hall = hallAt(p);
      const state = current.current;
      if (hall && state.hallId !== hall.id) {
        const previousHall = state.hallId;
        state.hallId = hall.id;
        // Only a hall the visitor has physically stood in is recorded. A hall
        // entered straight from a corridor is a doorway crossing; anything
        // else is an entrance (first hall of the visit, after a refresh, or a
        // direct route that hopped rooms).
        state.enterHall(
          hall.id,
          previousHall === null && state.cameFromCorridor ? "portal" : "entry",
        );
        state.cameFromCorridor = false;
      }
      if (!hall) state.cameFromCorridor = true;
    },
    () => {
      // Manual walking always takes over from an automated tour: the visitor
      // has chosen a new gaze, so the guide waits instead of dragging them on.
      const state = current.current;
      if (state.tourPhase === "walking") state.pauseTour();
    },
  );
  const narration = useNarration(() => {
    if (tour.state.phase === "listening") tour.next();
  });
  current.current = {
    ...current.current,
    nearby: catalog.nearby,
    record: collection.record,
    enterHall: collection.enterHall,
    tourPhase: tour.state.phase,
    target: tour.target,
    pauseTour: pauseTourInternal,
  };

  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<number | undefined>(undefined);
  const showNotice = (message: string | null) => {
    setNotice(message);
    window.clearTimeout(noticeTimer.current);
    if (message) noticeTimer.current = window.setTimeout(() => setNotice(null), 9000);
  };

  /**
   * Walk to a specific hanging. When no route exists the visitor is not
   * moved at all: the reason is shown, and their safe position is kept.
   */
  const goToPlacement = (placementId: string, viaTour = false) => {
    const placement = placementById(placementId);
    if (!placement) return false;
    const plan = planToPlacement(walker.positionRef.current, placement.id);
    if (!plan) {
      const message = `暂时无法前往「${artworkById(placement.artworkId)?.title}」所在的${
        hallById(placement.hallId)?.name
      }：通往那里的门户可能正在检修。你仍在安全的位置。`;
      if (viaTour) tour.block(message);
      else showNotice(message);
      return false;
    }
    catalog.select(placementId);
    walker.runTo(plan.points);
    return true;
  };

  /**
   * Going to an artwork from a list or a saved favourite resolves to a
   * hanging. Prefer the one in the current hall so familiarity grows by
   * walking, otherwise the nearest reachable one.
   */
  const go = (placementOrArtworkId: string) => {
    const placement = placementById(placementOrArtworkId);
    if (placement) {
      goToPlacement(placement.id);
      return;
    }
    const candidates = placementsByArtwork(placementOrArtworkId);
    if (!candidates.length) return;
    const here = walker.positionRef.current;
    const hall = hallAt(here);
    const currentInHall = candidates.find((p) => p.hallId === hall?.id);
    if (currentInHall) {
      goToPlacement(currentInHall.id);
      return;
    }
    const ranked = candidates
      .map((p) => ({
        p,
        plan: planToPlacement(here, p.id),
        reachable: isPlacementReachable(p.id),
      }))
      .sort((a, b) => Number(b.reachable) - Number(a.reachable));
    const best = ranked.find((r) => r.plan) || ranked[0];
    goToPlacement(best.p.id);
  };

  function pauseTourInternal() {
    tour.pause();
    walker.cancelRun();
    narration.pause();
  }

  // Chase the tour: plan a path to the current stop, then hand over to the
  // audio guide only once the walker truly stands on its viewing point.
  useEffect(() => {
    if (tour.state.phase !== "walking" || !tour.target) return;
    const placement = placementById(tour.target);
    if (!placement) return;
    const here = walker.positionRef.current;
    // If a doorway was just used, prefer a route that does not immediately
    // reverse through it — but never refuse the walk because of that
    // preference. If the direct route is the only one, it is still taken.
    const plan = planToPlacement(here, placement.id);
    if (!plan) {
      tour.block(
        `暂时无法前往「${artworkById(placement.artworkId)?.title}」所在的${
          hallById(placement.hallId)?.name
        }：通往那里的门户可能正在检修。你仍停在安全的位置。`,
      );
      return;
    }
    walker.runTo(plan.points, () => {
      const arrivedHall = hallAt(walker.positionRef.current);
      if (arrivedHall?.id !== placement.hallId) {
        tour.block(
          `没有抵达${hallById(placement.hallId)?.name}，你仍在${arrivedHall?.name || "通道"}。`,
        );
        return;
      }
      // Turn to face the hanging itself, not a remembered angle: the gaze,
      // the artwork's world transform and the map all agree.
      walker.lookAt(localToWorld(arrivedHall, placement.position));
      tour.arrive();
      narration.play(placement.artworkId);
    });
  }, [tour.state.phase, tour.target]);

  // Track time only while actually standing near a work in its own hall.
  useEffect(() => {
    const timer = setInterval(() => {
      const state = current.current;
      if (!state.nearby) return;
      const placement = placementById(state.nearby);
      if (!placement) return;
      const here = regionAt(walker.positionRef.current);
      if (here?.kind !== "hall" || here.hall.id !== placement.hallId) return;
      state.record(placement.artworkId, placement.hallId, 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Persist pose and document so a refresh returns the visitor to real ground.
  // The pose is throttled: writing it on every React render would turn a walk
  // into hundreds of synchronous localStorage writes per second.
  useEffect(() => {
    const savePoseNow = () => {
      const p = walker.positionRef.current;
      const region = regionAt(p);
      if (region?.kind !== "hall") return; // never save a corridor position
      savePose({
        hallId: region.hall.id,
        x: p.x,
        z: p.z,
        yaw: walker.yaw.current,
      });
    };
    const saveDocumentNow = () => saveDocument(collection.document);
    savePoseNow();
    saveDocumentNow();
    const interval = window.setInterval(savePoseNow, 2000);
    window.addEventListener("beforeunload", savePoseNow);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("beforeunload", savePoseNow);
    };
  }, [collection.document]);

  // Record the starting hall only once the visitor is actually inside it.
  useEffect(() => {
    const seat = restorePose(loadPose());
    if (seat?.hallId) {
      collection.enterHall(seat.hallId, "entry");
      current.current.hallId = seat.hallId;
    }
    // Only the first mount may credit the starting hall.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    catalog,
    tour,
    collection,
    walker,
    narration,
    go,
    notice,
    dismissNotice: () => showNotice(null),
    currentHall: hallById(walker.hallId),
    currentCorridor: walker.corridorId
      ? portalById(walker.corridorId)
      : null,
    pauseTour: pauseTourInternal,
    /**
     * Choosing another route while a tour is paused or blocked replaces the
     * plan cleanly: the old walk is cancelled, audio stops, and the new route
     * starts from the visitor's current (safe) position.
     */
    startTour: (routeId: string) => {
      walker.cancelRun();
      narration.pause();
      tour.start(routeId);
      showNotice(null);
    },
    pauseForLook: () => {
      if (current.current.tourPhase === "walking") pauseTourInternal();
    },
    resumeTour: () => {
      const state = tour.state;
      tour.resume();
      if (state.phase === "paused" && state.resumePhase === "listening") {
        // The talk was interrupted, not finished: pick the caption back up
        // for the stop we are standing at instead of replaying from zero.
        const placement = placementById(tour.target);
        if (placement) narration.play(placement.artworkId);
      }
    },
    stopTour: () => {
      tour.stop();
      walker.cancelRun();
      narration.pause();
    },
    nextTour: () => {
      walker.cancelRun();
      narration.pause();
      tour.next();
    },
    retryTour: () => {
      tour.retry();
    },
    resetToSafe: () => {
      const hall = (walker.hallId && hallById(walker.hallId)) || hallById("main")!;
      walker.runTo([safeStandingPoint(hall)]);
    },
    toLocal: (p: { x: number; z: number }) => {
      const hall = walker.hallId ? hallById(walker.hallId) : null;
      return hall ? worldToLocal(hall, p) : null;
    },
  };
}
