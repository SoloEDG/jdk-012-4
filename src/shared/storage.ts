import type { GalleryDocument, HallVisit, SavedPose, Visit } from "./types";

const key = "yujing-gallery-v2";
const legacyKey = "yujing-gallery-v1";
const poseKey = "yujing-gallery-pose-v1";

export const emptyDocument = (): GalleryDocument => ({
  favorites: [],
  visits: [],
  notes: {},
  halls: [],
});

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

function loadLegacy(): Partial<GalleryDocument> | null {
  try {
    const d = JSON.parse(localStorage.getItem(legacyKey) || "null");
    return d && typeof d === "object" ? d : null;
  } catch {
    return null;
  }
}

function cleanVisits(value: unknown): Visit[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (v): v is Record<string, unknown> =>
        !!v && typeof v === "object" && typeof v.id === "string",
    )
    .map((v) => {
      const at = typeof v.at === "number" ? v.at : Date.now();
      return {
        id: v.id as string,
        seconds: typeof v.seconds === "number" ? v.seconds : 0,
        at,
        halls: strings(v.halls),
      };
    });
}

function cleanHalls(value: unknown): HallVisit[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (v): v is Record<string, unknown> =>
        !!v && typeof v === "object" && typeof v.hallId === "string",
    )
    .map((v) => ({
      hallId: v.hallId as string,
      at: typeof v.at === "number" ? v.at : Date.now(),
      via: v.via === "entry" ? "entry" : "portal",
    }));
}

export function loadDocument(): GalleryDocument {
  try {
    const raw =
      localStorage.getItem(key) ?? localStorage.getItem(legacyKey);
    if (!raw) return emptyDocument();
    const d = JSON.parse(raw);
    if (!d || typeof d !== "object") return emptyDocument();
    const legacy = d.visits ? null : loadLegacy();
    const merged = legacy ? { ...legacy, ...d } : d;
    const notes: Record<string, string> = {};
    if (merged.notes && typeof merged.notes === "object") {
      for (const [k, v] of Object.entries(merged.notes))
        if (typeof v === "string") notes[k] = v;
    }
    return {
      favorites: strings(merged.favorites),
      visits: cleanVisits(merged.visits),
      notes,
      halls: cleanHalls(merged.halls),
    };
  } catch {
    return emptyDocument();
  }
}

export function saveDocument(d: GalleryDocument): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(d));
    return true;
  } catch {
    return false;
  }
}

/**
 * Save and load the walker's pose. Validation against hall geometry happens
 * in the space layer, so a corrupted or stale pose can never put the camera
 * inside a wall.
 */
export function savePose(pose: SavedPose): boolean {
  try {
    localStorage.setItem(poseKey, JSON.stringify(pose));
    return true;
  } catch {
    return false;
  }
}

export function loadPose(): unknown {
  try {
    const raw = localStorage.getItem(poseKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
