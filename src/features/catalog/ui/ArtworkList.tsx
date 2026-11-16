import {
  artworks,
  hallById,
  placements,
  placementsInHall,
} from "../../../shared/catalog";
import type { Hall } from "../../../shared/types";
import { ArrowUpRight } from "lucide-react";

const ARTWORK_INDEX = new Map(artworks.map((a, i) => [a.id, i + 1]));

export function ArtworkList({
  active,
  currentHallId,
  onSelect,
}: {
  active: string | null;
  currentHallId: string | null;
  onSelect: (placementId: string) => void;
}) {
  // Show the current hall first so the list matches what is reachable by
  // walking; every other hanging stays visible with its hall noted.
  const ordered = currentHallId
    ? [
        ...placementsInHall(currentHallId),
        ...placements.filter((p) => p.hallId !== currentHallId),
      ]
    : placements;
  const halls = [...new Set(ordered.map((p) => p.hallId))].map((id) => hallById(id) as Hall);
  return (
    <div className="artwork-list">
      {halls.map((hall) => (
        <div key={hall.id} className="hall-list-group">
          <div className="hall-list-heading">
            <span>
              {hall.floor} · {hall.name}
            </span>
            <small>{hall.en}</small>
          </div>
          {ordered
            .filter((p) => p.hallId === hall.id)
            .map((p) => {
              const art = artworks.find((a) => a.id === p.artworkId)!;
              return (
                <button
                  className={
                    active === p.id
                      ? "art-row active"
                      : currentHallId && currentHallId !== hall.id
                        ? "art-row elsewhere"
                        : "art-row"
                  }
                  onClick={() => onSelect(p.id)}
                  key={p.id}
                >
                  <span className="art-number">
                    {String(ARTWORK_INDEX.get(art.id) ?? 0).padStart(2, "0")}
                  </span>
                  <span>
                    <strong>{art.title}</strong>
                    <small>{p.label}</small>
                  </span>
                  <ArrowUpRight size={16} />
                </button>
              );
            })}
        </div>
      ))}
    </div>
  );
}
