import { useEffect, useMemo, useRef, useState } from "react";
import { halls } from "../../../shared/catalog";
import type { Point } from "../../../shared/types";
import { loadPose } from "../../../shared/storage";
import {
  corridorAt,
  elevationAt,
  hallAt,
  regionAt,
  restorePose,
  safeStandingPoint,
  stepTowards,
} from "../lib/geometry";
import { cameraForward, cameraRight, yawLookingAt } from "../lib/transform";

const WALK_SPEED = 2.6;

export type WalkerNotice = (p: Point) => void;

/**
 * The walker lives in the shared world plan. Halls and corridors are one
 * continuous walkable union, so stepping through a doorway never teleports
 * or bounces the camera: the same position and gaze simply continue.
 */
export function useWalker(
  onPosition: WalkerNotice,
  onManualMove?: () => void,
) {
  const initial = useMemo(() => {
    const restored = restorePose(loadPose());
    if (restored) {
      return {
        position: restored.position,
        yaw: restored.yaw,
        hallId: restored.hallId,
      };
    }
    const hall = halls[0];
    return {
      position: safeStandingPoint(hall),
      yaw: hall.spawnYaw,
      hallId: hall.id,
    };
  }, []);
  const [position, setPosition] = useState<Point>(initial.position);
  const [hallId, setHallId] = useState<string | null>(initial.hallId);
  const [corridorId, setCorridorId] = useState<string | null>(null);
  const positionRef = useRef(position);
  const yaw = useRef(initial.yaw);
  const elevationRef = useRef(elevationAt(initial.position));
  const hallIdRef = useRef(hallId);
  const corridorIdRef = useRef<string | null>(null);
  const keys = useRef(new Set<string>());
  const callback = useRef(onPosition);
  callback.current = onPosition;
  const manual = useRef(onManualMove);
  manual.current = onManualMove;
  const route = useRef<{
    points: Point[];
    index: number;
    finalYaw?: number;
    onDone?: () => void;
  } | null>(null);

  useEffect(() => {
    const isMoveKey = (key: string) =>
      ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(
        key,
      );
    const down = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.("input,textarea,select")) return;
      const key = e.key.toLowerCase();
      if (!isMoveKey(key)) return;
      e.preventDefault();
      if (route.current) {
        // Taking the wheel ends automated walking; the tour is told to pause.
        route.current = null;
        manual.current?.();
      }
      keys.current.add(key);
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const blur = () => keys.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);

    let last = performance.now();
    let frame = 0;
    let lastHallId: string | null = hallIdRef.current;
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      let p = positionRef.current;
      const r = route.current;
      if (r) {
        let target = r.points[r.index];
        while (target && Math.hypot(target.x - p.x, target.z - p.z) < 0.12) {
          r.index += 1;
          target = r.points[r.index];
        }
        if (!target) {
          route.current = null;
          if (r.finalYaw !== undefined) yaw.current = r.finalYaw;
          r.onDone?.();
        } else {
          p = stepTowards(p, target, WALK_SPEED * dt);
        }
      } else {
        const k = keys.current;
        const forward =
          Number(k.has("w") || k.has("arrowup")) -
          Number(k.has("s") || k.has("arrowdown"));
        const strafe =
          Number(k.has("d") || k.has("arrowright")) -
          Number(k.has("a") || k.has("arrowleft"));
        if (forward || strafe) {
          const dir = cameraForward(yaw.current);
          const right = cameraRight(yaw.current);
          const m = Math.hypot(forward, strafe) || 1;
          const step = (WALK_SPEED * dt) / m;
          const destination = {
            x: p.x + (dir.x * forward + right.x * strafe) * step,
            z: p.z + (dir.z * forward + right.z * strafe) * step,
          };
          p = stepTowards(p, destination, WALK_SPEED * dt);
        }
      }
      if (!regionAt(p)) p = positionRef.current;
      const targetElevation = elevationAt(p);
      elevationRef.current +=
        (targetElevation - elevationRef.current) * Math.min(1, dt * 9);
      if (Math.hypot(p.x - positionRef.current.x, p.z - positionRef.current.z) > 0.0001) {
        positionRef.current = p;
        setPosition(p);
        callback.current(p);
      }
      const nextHall = hallAt(p)?.id ?? null;
      if (nextHall !== lastHallId) {
        lastHallId = nextHall;
        hallIdRef.current = nextHall;
        setHallId(nextHall);
      }
      const nextCorridor = corridorAt(p)?.portal.id ?? null;
      if (nextCorridor !== corridorIdRef.current) {
        corridorIdRef.current = nextCorridor;
        setCorridorId(nextCorridor);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  return {
    position,
    positionRef,
    yaw,
    elevationRef,
    hallId,
    corridorId,
    /** Follow a planned path; the callback fires only after the last point. */
    runTo: (points: Point[], onDone?: () => void, finalYaw?: number) => {
      route.current = { points, index: 0, onDone, finalYaw };
    },
    cancelRun: () => {
      route.current = null;
    },
    isRunning: () => !!route.current,
    /** Turn the camera to face a world point without moving. */
    lookAt: (p: Point) => {
      const here = positionRef.current;
      yaw.current = yawLookingAt({ x: p.x - here.x, z: p.z - here.z });
    },
    stop: () => {
      route.current = null;
      keys.current.clear();
    },
  };
}
