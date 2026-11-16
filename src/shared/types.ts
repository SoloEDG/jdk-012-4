export type Point = { x: number; z: number };
export type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number };
export type Artwork = {
  id: string;
  title: string;
  en: string;
  artist: string;
  year: string;
  medium: string;
  color: string;
  description: string;
  transcript: string[];
  duration: number;
};
/** A room in the exhibition. Geometry is authored in the hall's local space. */
export type Hall = {
  id: string;
  name: string;
  en: string;
  floor: string;
  floorLabel: string;
  /** Local (0, 0) in world space. */
  origin: Point;
  /** Yaw, in radians, applied to the whole hall. */
  rotation: number;
  /** Uniform scale of the hall's local space. */
  scale: number;
  /** Floor height in world space; corridors ramp between halls. */
  elevation: number;
  width: number;
  depth: number;
  height: number;
  /** Walkable interior, in local space, inset from the walls. */
  bounds: Bounds;
  /** An optional solid piece of furniture in local hall space. */
  obstacle?: Bounds;
  spawn: Point;
  spawnYaw: number;
  palette: {
    background: string;
    fog: string;
    floor: string;
    wall: string;
    accent: string;
  };
};
/** One physical hanging of an artwork. The same artwork may have several. */
export type Placement = {
  id: string;
  artworkId: string;
  hallId: string;
  position: Point;
  facing: number;
  /** Editorial label used to tell two hangings of one artwork apart. */
  label: string;
};
export type PortalSide = {
  hallId: string;
  /** Threshold centre, on the wall, in that hall's local space. */
  position: Point;
  /** Unit vector pointing from the threshold into the hall. */
  normal: Point;
  width: number;
};
export type Portal = {
  id: string;
  name: string;
  a: PortalSide;
  b: PortalSide;
  closed?: boolean;
  note?: string;
};
export type Route = {
  id: string;
  name: string;
  subtitle: string;
  /** Placement ids, not artwork ids: a tour can visit two hangings of one work. */
  stops: string[];
};
export type HallVisit = {
  hallId: string;
  at: number;
  via: "entry" | "portal";
};
export type Visit = {
  /** Keyed by artwork id: notes and viewing history belong to the work. */
  id: string;
  seconds: number;
  at: number;
  /** Halls in which this work was actually viewed. */
  halls: string[];
};
export type GalleryDocument = {
  favorites: string[];
  visits: Visit[];
  notes: Record<string, string>;
  /** Halls the visitor has physically entered — never halls merely targeted. */
  halls: HallVisit[];
};
export type TourPhase =
  | "idle"
  | "walking"
  | "listening"
  | "paused"
  | "blocked"
  | "done";
export type TourState = {
  routeId: string | null;
  step: number;
  phase: TourPhase;
  /** Phase to restore when a paused tour continues. */
  resumePhase?: "walking" | "listening";
  /** Why the tour stopped short, and how to get going again. */
  note?: string;
};
export type AudioState = {
  artworkId: string | null;
  elapsed: number;
  playing: boolean;
  rate: number;
};
/** A saved walker pose. Hall-local, so it survives hall transforms changing. */
export type SavedPose = {
  hallId: string;
  x: number;
  z: number;
  yaw: number;
};
