import * as THREE from "three";
import {
  halls,
  placements,
  portals,
} from "../../../shared/catalog";
import type { Hall, Point, PortalSide } from "../../../shared/types";
import { artTexture } from "./artTexture";
import {
  localToWorld,
  sideNormalWorld,
  sideWorld,
  sub,
  normalize,
  distance as distanceOf,
} from "./transform";
import { BODY_RADIUS } from "./geometry";

export interface SceneFrame {
  mesh: THREE.Mesh;
  placementId: string;
  artworkId: string;
}

export interface SceneBuild {
  scene: THREE.Scene;
  frames: SceneFrame[];
  /** Per-hall palette so the viewport can tint the sky as we walk. */
  palette: Record<string, { background: string; fog: string }>;
  /** Sculptures that spin gently. */
  spinners: THREE.Object3D[];
}

const wallThickness = 0.3;

function wallPiece(
  group: THREE.Group,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  color: string,
  roughness = 0.85,
) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness }),
  );
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
}

type Axis = "x" | "z";

function wallGap(hall: Hall, side: PortalSide): { axis: Axis; gap: number } | null {
  const w = hall.width / 2;
  const d = hall.depth / 2;
  if (Math.abs(Math.abs(side.position.x) - w) < 0.35) {
    return { axis: "x", gap: side.position.z };
  }
  if (Math.abs(Math.abs(side.position.z) - d) < 0.35) {
    return { axis: "z", gap: side.position.x };
  }
  return null;
}

function buildWallWithGap(
  group: THREE.Group,
  hall: Hall,
  fixed: number,
  axis: Axis,
  gap: number | null,
  gapWidth: number,
  color: string,
) {
  const total = axis === "x" ? hall.depth : hall.width;
  const h = hall.height;
  const y = h / 2;
  const t = wallThickness;
  if (gap === null) {
    const size = total;
    wallPiece(
      group,
      axis === "x" ? t : size,
      h,
      axis === "x" ? size : t,
      axis === "x" ? fixed : 0,
      y,
      axis === "x" ? 0 : fixed,
      color,
    );
    return;
  }
  const half = gapWidth / 2;
  const spans: [number, number][] = [
    [-total / 2, gap - half],
    [gap + half, total / 2],
  ];
  for (const [a, b] of spans) {
    const size = b - a;
    if (size <= 0.02) continue;
    const center = (a + b) / 2;
    wallPiece(
      group,
      axis === "x" ? t : size,
      h,
      axis === "x" ? size : t,
      axis === "x" ? fixed : center,
      y,
      axis === "x" ? center : fixed,
      color,
    );
  }
  // Lintel above the opening.
  wallPiece(
    group,
    axis === "x" ? t : gapWidth + 0.4,
    hall.height * 0.22,
    axis === "x" ? gapWidth + 0.4 : t,
    axis === "x" ? fixed : gap,
    h - hall.height * 0.11,
    axis === "x" ? gap : fixed,
    color,
  );
}

function hallGroup(hall: Hall, frames: SceneFrame[], spinners: THREE.Object3D[]) {
  const group = new THREE.Group();
  group.position.set(hall.origin.x, hall.elevation, hall.origin.z);
  group.rotation.y = hall.rotation;
  group.scale.setScalar(hall.scale);
  const { width: w, depth: d, height: h } = hall;
  const palette = hall.palette;

  wallPiece(group, w, 0.15, d, 0, -0.08, 0, palette.floor, 0.9);
  // Inset floor border, a quiet cue that each hall has its own proportions.
  wallPiece(group, w - 0.9, 0.02, d - 0.9, 0, 0.005, 0, palette.background, 0.95);

  // Only open doorways cut a hole in the wall; a closed portal stays solid
  // and gets a visible barrier instead.
  const ownSides = portals
    .filter((p) => !p.closed)
    .flatMap((p) => [p.a, p.b])
    .filter((s) => s.hallId === hall.id);

  const sideFor = (axis: Axis, sign: number) => {
    const fixed = (axis === "x" ? w : d) / 2 * sign;
    return ownSides.find((s) => {
      const g = wallGap(hall, s);
      if (!g || g.axis !== axis) return false;
      const value = axis === "x" ? s.position.x : s.position.z;
      return Math.abs(value - fixed) < 0.35;
    });
  };

  for (const axis of ["x", "z"] as Axis[]) {
    for (const sign of [-1, 1]) {
      const side = sideFor(axis, sign);
      const fixed = ((axis === "x" ? w : d) / 2) * sign;
      const gapInfo = side ? wallGap(hall, side) : null;
      buildWallWithGap(
        group,
        hall,
        fixed,
        axis,
        gapInfo ? gapInfo.gap : null,
        side ? side.width : 0,
        palette.wall,
      );
    }
  }

  // Floor guide lines.
  const lineMat = new THREE.MeshBasicMaterial({ color: palette.accent, transparent: true, opacity: 0.55 });
  for (let z = -Math.floor(d / 4) * 2 + 1; z < d / 2; z += 2) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(w - 1, 0.006, 0.02), lineMat);
    line.position.set(0, 0.012, z);
    group.add(line);
  }
  for (let x = -Math.floor(w / 4) * 2 + 1; x < w / 2; x += 2) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.006, d - 1), lineMat);
    line.position.set(x, 0.012, 0);
    group.add(line);
  }

  // Centre furniture.
  const o = hall.obstacle;
  if (o) {
    const ow = o.maxX - o.minX;
    const od = o.maxZ - o.minZ;
    wallPiece(group, ow, 0.7, od, (o.minX + o.maxX) / 2, 0.35, (o.minZ + o.maxZ) / 2, palette.accent, 0.7);
    const plinth = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.5 * Math.min(1, ow / 2.6), 0.12, 90, 14),
      new THREE.MeshStandardMaterial({
        color: hall.id === "cellar" ? "#5d6f62" : "#81765f",
        metalness: 0.7,
        roughness: 0.28,
      }),
    );
    plinth.position.set((o.minX + o.maxX) / 2, 1.55, (o.minZ + o.maxZ) / 2);
    group.add(plinth);
    spinners.push(plinth);
  }

  // Hangings.
  for (const placement of placements.filter((p) => p.hallId === hall.id)) {
    const g = new THREE.Group();
    g.position.set(placement.position.x, 2.45, placement.position.z);
    g.rotation.y = placement.facing;
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 2.9, 0.12),
      new THREE.MeshStandardMaterial({ color: "#3c3830" }),
    );
    g.add(frame);
    const artwork = placements.find((p) => p.id === placement.id)!;
    const image = new THREE.Mesh(
      new THREE.PlaneGeometry(2.13, 2.73),
      new THREE.MeshBasicMaterial({ map: artTexture(artwork.artworkId) }),
    );
    image.position.z = 0.07;
    image.userData.placementId = placement.id;
    image.userData.artworkId = placement.artworkId;
    g.add(image);
    frames.push({
      mesh: image,
      placementId: placement.id,
      artworkId: placement.artworkId,
    });
    const plaque = new THREE.Mesh(
      new THREE.PlaneGeometry(0.62, 0.14),
      new THREE.MeshBasicMaterial({ color: "#f2eee3" }),
    );
    plaque.position.set(0.68, -1.66, 0.08);
    g.add(plaque);
    // Wall label: a slim strip of light tells two hangings apart at a glance.
    const strip = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.04),
      new THREE.MeshBasicMaterial({ color: hall.palette.accent }),
    );
    strip.position.set(0.68, -1.52, 0.08);
    g.add(strip);
    group.add(g);
  }

  return group;
}

function buildCorridor(portalId: string): THREE.Group | null {
  const portal = portals.find((p) => p.id === portalId)!;
  const hallA = halls.find((h) => h.id === portal.a.hallId);
  const hallB = halls.find((h) => h.id === portal.b.hallId);
  if (!hallA || !hallB) return null;
  const a = sideWorld(hallA, portal.a);
  const b = sideWorld(hallB, portal.b);
  const length = distanceOf(a, b);
  if (length < 0.2) return null;
  const dir = normalize(sub(b, a));
  const mid = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
  const group = new THREE.Group();
  group.position.set(mid.x, 0, mid.z);
  // Corridor runs along its own local +z after this rotation.
  group.rotation.y = Math.atan2(dir.x, dir.z);
  const width = (portal.a.width + portal.b.width) / 2;
  const elevA = hallA.elevation;
  const elevB = hallB.elevation;
  const rise = elevB - elevA;
  const tilt = Math.atan2(rise, length);
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.14, length / Math.cos(tilt)),
    new THREE.MeshStandardMaterial({
      color: hallA.palette.floor,
      roughness: 0.9,
    }),
  );
  floor.position.y = elevA + rise / 2 - 0.07;
  floor.rotation.x = -tilt;
  group.add(floor);
  // Plus-shaped side walls guide the eye; they intentionally stop at the
  // thresholds so the rooms read as one continuous space.
  const wallMat = new THREE.MeshStandardMaterial({
    color: hallA.palette.wall,
    roughness: 0.9,
  });
  const wallHeight = 2.6;
  for (const sign of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.14, wallHeight, length / Math.cos(tilt)), wallMat);
    wall.position.set(
      sign * (width / 2 + 0.07),
      elevA + rise / 2 + wallHeight / 2 - 0.1,
      0,
    );
    wall.rotation.x = -tilt;
    group.add(wall);
  }
  const ceiling = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.3, 0.12, length / Math.cos(tilt)),
    wallMat,
  );
  ceiling.position.y = elevA + rise / 2 + wallHeight - 0.1;
  ceiling.rotation.x = -tilt;
  group.add(ceiling);
  return group;
}

/** A small marker sitting on each threshold, readable from the floor. */
function buildDoorMarkers(): THREE.Group {
  const group = new THREE.Group();
  for (const portal of portals) {
    for (const side of [portal.a, portal.b]) {
      const hall = halls.find((h) => h.id === side.hallId);
      if (!hall) continue;
      const world = sideWorld(hall, side);
      const normal = sideNormalWorld(hall, side);
      const color = portal.closed ? "#8a4f3d" : "#c6ac76";
      const marker = new THREE.Mesh(
        new THREE.BoxGeometry(portal.closed ? 1.8 : 1.6, 0.04, 0.14),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }),
      );
      marker.position.set(world.x, hall.elevation + 0.03, world.z);
      marker.rotation.y = Math.atan2(normal.x, normal.z);
      marker.position.x += normal.x * (BODY_RADIUS + 0.25);
      marker.position.z += normal.z * (BODY_RADIUS + 0.25);
      group.add(marker);
      if (portal.closed) {
        const bar = new THREE.Mesh(
          new THREE.BoxGeometry(1.9, 1.6, 0.08),
          new THREE.MeshStandardMaterial({
            color: "#6d5a44",
            transparent: true,
            opacity: 0.5,
            roughness: 0.9,
          }),
        );
        bar.position.set(world.x, hall.elevation + 0.8, world.z);
        bar.rotation.y = Math.atan2(normal.x, normal.z);
        group.add(bar);
      }
    }
  }
  return group;
}

export function buildScene(): SceneBuild {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(halls[0].palette.background);
  scene.fog = new THREE.Fog(halls[0].palette.background, 16, 44);
  scene.add(new THREE.HemisphereLight("#fff8e8", "#74675a", 2.1));
  const sun = new THREE.DirectionalLight("#fff2d7", 2.6);
  sun.position.set(6, 12, 8);
  scene.add(sun);
  const fill = new THREE.DirectionalLight("#cfd9ff", 0.8);
  fill.position.set(-8, 6, -6);
  scene.add(fill);

  const frames: SceneFrame[] = [];
  const spinners: THREE.Object3D[] = [];
  const palette: SceneBuild["palette"] = {};
  for (const hall of halls) {
    scene.add(hallGroup(hall, frames, spinners));
    palette[hall.id] = { background: hall.palette.background, fog: hall.palette.fog };
  }
  for (const portal of portals) {
    if (portal.closed) continue;
    const corridor = buildCorridor(portal.id);
    if (corridor) scene.add(corridor);
  }
  scene.add(buildDoorMarkers());
  return { scene, frames, palette, spinners };
}

export function disposeScene(scene: THREE.Scene) {
  scene.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
        m.dispose();
      }
    }
  });
}
