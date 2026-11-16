import { Heart, Download, ArrowUpRight, MapPin } from "lucide-react";
import type { GalleryDocument } from "../../../shared/types";
import { artworkById, hallById } from "../../../shared/catalog";
import { recapStats, createRecap } from "../lib/recap";
import { downloadRecap } from "../lib/download";
export function CollectionPanel({
  document,
  onSelect,
  onNote,
  onToggle,
}: {
  document: GalleryDocument;
  /** Favourites point at artworks; choosing one walks to its nearest hanging. */
  onSelect: (artworkId: string) => void;
  onNote: (artworkId: string, text: string) => void;
  onToggle: (artworkId: string) => void;
}) {
  const stats = recapStats(document);
  const halls = document.halls
    .map((h) => hallById(h.hallId))
    .filter((h): h is NonNullable<typeof h> => !!h);
  return (
    <div className="collection-panel">
      <div className="eyebrow">YOUR PERSONAL GALLERY</div>
      <h2>把共鸣，留在这里。</h2>
      <div className="stats">
        <span>
          <strong>{stats.seen}</strong>已观看
        </span>
        <span>
          <strong>{stats.saved}</strong>已收藏
        </span>
        <span>
          <strong>{Math.floor(stats.seconds / 60)}′</strong>停留时长
        </span>
      </div>
      <p className="visited-halls">
        <MapPin size={12} />
        {halls.length
          ? `已到访 ${halls.length} 个展厅：${halls.map((h) => h.name).join("、")}`
          : "还没有进入任何展厅。走进展厅后，才会记入回顾。"}
      </p>
      {document.favorites.length === 0 ? (
        <div className="empty">
          <Heart size={28} />
          <p>遇见喜欢的作品，点亮一颗心。</p>
          <small>你的参观故事，将从这里开始。</small>
        </div>
      ) : (
        document.favorites.map((artworkId) => {
          const a = artworkById(artworkId);
          if (!a) return null;
          const visit = document.visits.find((v) => v.id === artworkId);
          const places = (visit?.halls || [])
            .map((id) => hallById(id))
            .filter((h): h is NonNullable<typeof h> => !!h);
          return (
            <article className="saved-card" key={artworkId}>
              <button className="saved-title" onClick={() => onSelect(artworkId)}>
                {a.title}
                <ArrowUpRight size={15} />
              </button>
              <small>
                {a.artist} · {a.year}
                {places.length
                  ? ` · ${places.map((h) => h.name).join(" / ")}`
                  : ""}
              </small>
              <textarea
                aria-label={"感想-" + a.title}
                placeholder="写下此刻的感受…"
                value={document.notes[artworkId] || ""}
                onChange={(e) => onNote(artworkId, e.target.value)}
                maxLength={1000}
              />
              <button className="text-button" onClick={() => onToggle(artworkId)}>
                移出收藏
              </button>
            </article>
          );
        })
      )}
      <button
        className="primary full"
        disabled={!stats.saved}
        onClick={() => downloadRecap(createRecap(document))}
      >
        <Download size={16} />
        生成个人参观回顾
      </button>
    </div>
  );
}
