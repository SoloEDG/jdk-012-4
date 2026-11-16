import { Heart, Headphones, ArrowUpRight, MapPin } from "lucide-react";
import {
  artworkById,
  hallById,
  placementById,
  placementsByArtwork,
} from "../../../shared/catalog";
export function ArtworkDetail({
  placementId,
  saved,
  onFavorite,
  onListen,
  onGo,
}: {
  placementId: string | null;
  saved: boolean;
  onFavorite: () => void;
  onListen: () => void;
  onGo: () => void;
}) {
  const placement = placementById(placementId);
  const a = artworkById(placement?.artworkId ?? null);
  if (!a || !placement) return <div>靠近一件作品，开始探索。</div>;
  const hall = hallById(placement.hallId);
  const siblings = placementsByArtwork(a.id).filter((p) => p.id !== placement.id);
  return (
    <section className="detail">
      <div className="eyebrow">
        ARTWORK INSIGHT <span>作品档案</span>
      </div>
      <div className={"art-preview art-" + a.id}>
        <span>{a.en}</span>
        <em className="placement-badge">
          {hall?.name} · {placement.label}
        </em>
      </div>
      <div className="detail-heading">
        <h2>{a.title}</h2>
        <button
          className={saved ? "icon-button saved" : "icon-button"}
          aria-label={saved ? "取消收藏" : "收藏作品"}
          onClick={onFavorite}
        >
          <Heart size={20} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <p className="artist">
        {a.artist} <span>/</span> {a.year}
      </p>
      <p className="medium">{a.medium}</p>
      <p className="placement-line">
        <MapPin size={12} />
        当前陈列 · {hall?.floorLabel} {hall?.name} · {placement.label}
      </p>
      <p className="description">{a.description}</p>
      {siblings.length > 0 && (
        <p className="sibling-note">
          同一件作品还陈列于：
          {siblings
            .map((s) => `${hallById(s.hallId)?.name}（${s.label}）`)
            .join("、")}
          。讲解与收藏属于作品本身。
        </p>
      )}
      <div className="detail-actions">
        <button className="primary" onClick={onListen}>
          <Headphones size={16} />
          收听作品讲解
        </button>
        <button className="text-button" onClick={onGo}>
          前往作品
          <ArrowUpRight size={16} />
        </button>
      </div>
    </section>
  );
}
