import {
  Route,
  ArrowRight,
  Pause,
  Play,
  X,
  RotateCcw,
  DoorClosed,
} from "lucide-react";
import { routes, placementById, hallById, artworkById } from "../../../shared/catalog";
import type { TourState } from "../../../shared/types";
import { tourProgress, tourRoute } from "../lib/routeProgress";

export function TourPanel({
  state,
  onStart,
  onPause,
  onResume,
  onStop,
  onNext,
  onRetry,
}: {
  state: TourState;
  onStart: (id: string) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onNext: () => void;
  onRetry: () => void;
}) {
  const current = tourRoute(state);
  const stop = current ? placementById(current.stops[state.step]) : null;
  const stopHall = stop ? hallById(stop.hallId) : null;
  const stopArtwork = stop ? artworkById(stop.artworkId) : null;
  const status = (() => {
    switch (state.phase) {
      case "walking":
        return `正在前往 · ${stopHall?.name} · ${stopArtwork?.title}`;
      case "listening":
        return `正在讲解 · ${stopHall?.name} · ${stopArtwork?.title}`;
      case "paused":
        return state.resumePhase === "listening"
          ? `讲解已暂停 · ${stopArtwork?.title}`
          : `导览已暂停 · ${stopArtwork?.title}`;
      case "blocked":
        return state.note || "暂时无法前往下一站";
      case "done":
        return "这段旅程已完成，收藏你的所见。";
      default:
        return "";
    }
  })();
  return (
    <section className="tour-panel">
      <div className="section-title">
        <Route size={16} />
        <span>主题导览</span>
        <small>CURATED JOURNEYS</small>
      </div>
      {current && state.phase !== "idle" ? (
        <div className={"current-tour phase-" + state.phase}>
          <span className="eyebrow">
            正在探索 ·{" "}
            {state.phase === "done"
              ? "已完成"
              : `${state.step + 1} / ${current.stops.length}`}
          </span>
          <h3>{current.name}</h3>
          <progress value={tourProgress(state)} max="1" />
          <p className="tour-status">{status}</p>
          {stop && state.phase !== "done" && (
            <p className="tour-stop-meta">
              {stopHall?.floorLabel} {stopHall?.name} · {stop.label}
            </p>
          )}
          {state.phase === "blocked" && (
            <div className="tour-blocked-note">
              <DoorClosed size={14} />
              <span>
                你仍在安全的位置。可以重试，或在导览面板里改走另一条路线。
              </span>
            </div>
          )}
          <div className="tour-controls">
            {state.phase === "blocked" ? (
              <>
                <button onClick={onRetry}>
                  <RotateCcw size={14} />
                  重新尝试
                </button>
                <button onClick={onStop}>结束导览</button>
              </>
            ) : state.phase !== "done" ? (
              <>
                <button onClick={state.phase === "paused" ? onResume : onPause}>
                  {state.phase === "paused" ? (
                    <Play size={14} />
                  ) : (
                    <Pause size={14} />
                  )}{" "}
                  {state.phase === "paused" ? "继续" : "暂停"}
                </button>
                <button onClick={onNext}>
                  下一站
                  <ArrowRight size={14} />
                </button>
                <button aria-label="结束导览" onClick={onStop}>
                  <X size={14} />
                </button>
              </>
            ) : (
              <button onClick={onStop}>结束导览</button>
            )}
          </div>
          {/* A visitor can always change their mind mid-route — most often
              when a doorway is closed and this trail no longer works. */}
          <details className="tour-switch">
            <summary>改走另一条路线</summary>
            <div className="tour-switch-list">
              {routes
                .filter((r) => r.id !== current.id)
                .map((r) => (
                  <button key={r.id} onClick={() => onStart(r.id)}>
                    {r.name}
                    <span>
                      {r.stops.length} 站 · {routeHallNames(r.stops)}
                    </span>
                  </button>
                ))}
            </div>
          </details>
        </div>
      ) : (
        routes.map((r, i) => (
          <button
            className={"route-card route-" + (i % 2)}
            key={r.id}
            onClick={() => onStart(r.id)}
          >
            <span>
              JOURNEY 0{i + 1}{" "}
              <span>
                {r.stops.length} 件作品 · {routeHallNames(r.stops)}
              </span>
            </span>
            <h3>
              {r.name}
              <ArrowUpRightIcon />
            </h3>
            <p>{r.subtitle}</p>
          </button>
        ))
      )}
    </section>
  );
}
function routeHallNames(stops: string[]) {
  return [
    ...new Set(stops.map((id) => hallById(placementById(id)?.hallId ?? null)?.name)),
  ]
    .filter(Boolean)
    .join(" / ");
}
function ArrowUpRightIcon() {
  return <span className="round-arrow">↗</span>;
}
