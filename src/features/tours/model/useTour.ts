import { useState } from "react";
import type { TourState } from "../../../shared/types";
import { routeById } from "../../../shared/catalog";

const initial: TourState = { routeId: null, step: 0, phase: "idle" };

export function useTour() {
  const [state, setState] = useState<TourState>(initial);
  return {
    state,
    target:
      (state.routeId &&
        routeById(state.routeId)?.stops[state.step]) ||
      null,
    start: (id: string) => {
      const route = routeById(id);
      if (route)
        setState({ routeId: id, step: 0, phase: "walking" });
    },
    arrive: () =>
      setState((t) =>
        t.phase === "walking" ? { ...t, phase: "listening", note: undefined } : t,
      ),
    next: () =>
      setState((t) => {
        const route = routeById(t.routeId);
        if (!route) return t;
        return t.step + 1 >= route.stops.length
          ? { ...t, phase: "done", note: undefined }
          : { ...t, step: t.step + 1, phase: "walking", note: undefined };
      }),
    /**
     * Pause keeps the current step but remembers whether the visitor was
     * walking or listening, so resuming returns to the same beat rather than
     * skipping a talk or swallowing the next walk.
     */
    pause: () =>
      setState((t) => {
        if (t.phase === "walking" || t.phase === "listening")
          return { ...t, phase: "paused", resumePhase: t.phase };
        return t;
      }),
    resume: () =>
      setState((t) =>
        t.phase === "paused"
          ? { ...t, phase: t.resumePhase || "walking", note: undefined }
          : t,
      ),
    /** The stop could not be reached; keep the visitor in place and explain. */
    block: (note: string) =>
      setState((t) => ({ ...t, phase: "blocked", note })),
    /** Try the same stop again from wherever the visitor now stands. */
    retry: () =>
      setState((t) =>
        t.phase === "blocked" ? { ...t, phase: "walking", note: undefined } : t,
      ),
    stop: () => setState(initial),
  };
}
