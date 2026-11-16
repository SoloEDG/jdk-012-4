import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { Point } from "../../../shared/types";
import { halls } from "../../../shared/catalog";
import { buildScene, disposeScene } from "../lib/buildScene";
import { scaleAt } from "../lib/geometry";

export function Viewport({
  position,
  yaw,
  elevation,
  hallId,
  onSelect,
  onLook,
}: {
  position: React.RefObject<Point>;
  yaw: React.RefObject<number>;
  elevation: React.RefObject<number>;
  hallId: string | null;
  onSelect: (placementId: string) => void;
  /** Fired when the visitor drags the view themselves. */
  onLook?: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const select = useRef(onSelect);
  select.current = onSelect;
  const look = useRef(onLook);
  look.current = onLook;
  const hall = useRef(hallId);
  hall.current = hallId;
  const [error, setError] = useState("");

  // Looking around does not depend on WebGL: if the renderer is unavailable
  // the visitor can still turn the camera (and the tour still pauses).
  useEffect(() => {
    const el = root.current!;
    let dragging = false;
    let moved = 0;
    let lastClientX = 0;
    const down = (e: PointerEvent) => {
      dragging = true;
      lastClientX = e.clientX;
      moved = 0;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* capture is a nicety, not a requirement */
      }
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const delta = e.clientX - lastClientX;
      if (delta !== 0) {
        yaw.current -= delta * 0.005;
        moved += Math.abs(delta);
        // Dragging the view is a deliberate change of gaze: a running tour
        // pauses instead of fighting the visitor's hand.
        if (Math.abs(delta) > 0.5) look.current?.();
      }
      lastClientX = e.clientX;
    };
    const up = () => {
      dragging = false;
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [yaw]);

  useEffect(() => {
    const el = root.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      setError("当前设备无法启动三维画面，可继续通过作品列表参观。");
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.appendChild(renderer.domElement);
    const { scene, frames, palette, spinners } = buildScene();
    const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 120);
    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();

    const currentBackground = new THREE.Color(
      palette[halls[0].id]?.background || "#d7d5ce",
    );
    scene.background = currentBackground;
    const fog = scene.fog as THREE.Fog | null;
    const targetBackground = currentBackground.clone();

    // Click (not drag) selects a hanging. Listen on the canvas so drags that
    // begin on the HUD are never mistaken for artwork clicks.
    let downX = 0;
    let downY = 0;
    let downAt = 0;
    const canvasDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
      downAt = performance.now();
    };
    const canvasUp = (e: PointerEvent) => {
      const travel = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (travel >= 5 || performance.now() - downAt > 700) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const ray = new THREE.Raycaster();
      ray.setFromCamera(
        new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          (-(e.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      );
      const hit = ray.intersectObjects(frames.map((f) => f.mesh))[0];
      if (!hit) return;
      const found = frames.find((f) => f.mesh === hit.object);
      if (found) select.current(found.placementId);
    };
    renderer.domElement.addEventListener("pointerdown", canvasDown);
    renderer.domElement.addEventListener("pointerup", canvasUp);

    let frame = 0;
    let currentScale = 1;
    let currentElevation = 0;
    const tick = (now: number) => {
      const scale = scaleAt(position.current);
      currentScale += (scale - currentScale) * 0.08;
      currentElevation += (elevation.current - currentElevation) * 0.18;
      camera.position.set(
        position.current.x,
        currentElevation + 1.7 * currentScale,
        position.current.z,
      );
      camera.rotation.set(-0.03, yaw.current, 0);
      // Eye height follows the floor, but pitch and yaw never snap: crossing
      // a doorway is one continuous gaze, not a cut.
      for (const spinner of spinners) spinner.rotation.y = now * 0.00015;
      const activePalette = hall.current ? palette[hall.current] : undefined;
      if (activePalette) {
        targetBackground.set(activePalette.background);
        currentBackground.lerp(targetBackground, 0.06);
        scene.background = currentBackground;
        if (fog) fog.color.copy(currentBackground);
      }
      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", canvasDown);
      renderer.domElement.removeEventListener("pointerup", canvasUp);
      disposeScene(scene);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [position, yaw, elevation]);

  return (
    <div className="viewport" ref={root}>
      {error && <div className="webgl-error">{error}</div>}
    </div>
  );
}
