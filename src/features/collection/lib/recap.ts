import type { GalleryDocument } from "../../../shared/types";
import { artworkById, hallById } from "../../../shared/catalog";
export function recapStats(d: GalleryDocument) {
  return {
    seen: d.visits.filter((v) => v.seconds >= 2).length,
    seconds: Math.round(d.visits.reduce((n, v) => n + v.seconds, 0)),
    saved: d.favorites.length,
    halls: d.halls.length,
  };
}
export function createRecap(d: GalleryDocument): string {
  const stats = recapStats(d);
  const halls = d.halls
    .map((h) => hallById(h.hallId))
    .filter((h): h is NonNullable<typeof h> => !!h);
  const lines = [
    "余境 · 我的参观回顾",
    `观看 ${stats.seen} 件作品 · 停留 ${stats.seconds} 秒`,
    halls.length
      ? `走过的展厅：${halls.map((h) => `${h.floorLabel}${h.name}`).join("、")}`
      : "尚未进入任何展厅",
    "",
  ];
  for (const artworkId of d.favorites) {
    const a = artworkById(artworkId);
    if (!a) continue;
    const visit = d.visits.find((v) => v.id === artworkId);
    const places = (visit?.halls || [])
      .map((id) => hallById(id))
      .filter((h): h is NonNullable<typeof h> => !!h)
      .map((h) => h.name);
    lines.push(
      `${a.title} / ${a.artist}\n${d.notes[artworkId] || "未添加感想"}\n停留 ${Math.round(
        visit?.seconds || 0,
      )} 秒${places.length ? ` · 于${places.join("、")}观看` : ""}`,
    );
  }
  return lines.join("\n\n");
}
