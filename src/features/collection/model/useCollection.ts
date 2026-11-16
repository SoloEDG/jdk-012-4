import { useState, useEffect } from "react";
import { loadDocument, saveDocument } from "../../../shared/storage";
import { artworkById, hallById } from "../../../shared/catalog";

export function useCollection() {
  const [document, setDocument] = useState(loadDocument);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    setStorageError(!saveDocument(document));
  }, [document]);
  return {
    document,
    storageError,
    toggle: (artworkId: string) =>
      setDocument((d) => ({
        ...d,
        favorites: d.favorites.includes(artworkId)
          ? d.favorites.filter((x) => x !== artworkId)
          : [...d.favorites, artworkId],
      })),
    note: (artworkId: string, text: string) =>
      setDocument((d) => ({
        ...d,
        notes: { ...d.notes, [artworkId]: text },
      })),
    /**
     * Viewing time accrues to the artwork, but only when the visitor is
     * physically near it; the hall it happened in is remembered on the work.
     */
    record: (artworkId: string, hallId: string, seconds: number) => {
      if (!artworkById(artworkId) || !hallById(hallId)) return;
      setDocument((d) => {
        const existing = d.visits.find((v) => v.id === artworkId);
        const halls = existing?.halls ?? [];
        const nextHalls = halls.includes(hallId) ? halls : [...halls, hallId];
        return {
          ...d,
          visits: existing
            ? d.visits.map((v) =>
                v.id === artworkId
                  ? { ...v, seconds: v.seconds + seconds, halls: nextHalls }
                  : v,
              )
            : [
                ...d.visits,
                { id: artworkId, seconds, at: Date.now(), halls: nextHalls },
              ],
        };
      });
    },
    /**
     * A hall only enters the recap when the walker has actually stood inside
     * it. Targeting a placement in another hall does not count.
     */
    enterHall: (hallId: string, via: "entry" | "portal") => {
      if (!hallById(hallId)) return;
      // Idempotent: re-entering a hall, or React calling the updater twice,
      // records it once. A hall only counts once the visitor stood inside.
      setDocument((d) =>
        d.halls.some((h) => h.hallId === hallId)
          ? d
          : { ...d, halls: [...d.halls, { hallId, at: Date.now(), via }] },
      );
    },
  };
}
