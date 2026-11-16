import {
  artworks,
  halls,
  placementById,
  placements,
  portals,
} from "../../../shared/catalog";
import type { Hall, Point, Portal } from "../../../shared/types";
import {
  hallCorners,
  localToWorld,
  sideWorld,
  worldPlanBounds,
} from "../lib/transform";

const ARTWORK_INDEX: Record<string, number> = Object.fromEntries(
  artworks.map((a, i) => [a.id, i + 1]),
);

const plan = worldPlanBounds(halls);

function project(
  p: Point,
  viewBox: { x: number; y: number; w: number; h: number },
  padding = 10,
) {
  const width = plan.maxX - plan.minX || 1;
  const height = plan.maxZ - plan.minZ || 1;
  const scale = Math.min((viewBox.w - padding * 2) / width, (viewBox.h - padding * 2) / height);
  const cx = viewBox.x + viewBox.w / 2;
  const cy = viewBox.y + viewBox.h / 2;
  const midX = (plan.minX + plan.maxX) / 2;
  const midZ = (plan.minZ + plan.maxZ) / 2;
  return {
    x: cx + (p.x - midX) * scale,
    y: cy + (p.z - midZ) * scale,
  };
}

function portalIsOpen(portal: Portal) {
  return !portal.closed;
}

/**
 * The plan covers four halls across three floors; the viewBox is derived from
 * the actual plan extents so the small and large maps share one projection
 * and neither leaves dead space nor clips a hall.
 */
const PLAN_PADDING = 12;
function mapViewBox(large: boolean) {
  const width = plan.maxX - plan.minX || 1;
  const height = plan.maxZ - plan.minZ || 1;
  const w = width + PLAN_PADDING * 2;
  const h = height + PLAN_PADDING * 2;
  const targetAspect = large ? 1.16 : 0.82;
  if (w / h > targetAspect) {
    const nextH = w / targetAspect;
    return {
      x: plan.minX - PLAN_PADDING,
      y: (plan.minZ + plan.maxZ) / 2 - nextH / 2,
      w,
      h: nextH,
    };
  }
  const nextW = h * targetAspect;
  return {
    x: (plan.minX + plan.maxX) / 2 - nextW / 2,
    y: plan.minZ - PLAN_PADDING,
    w: nextW,
    h,
  };
}

export function Map({
  position,
  activePlacement,
  onSelect,
  large = false,
}: {
  position: Point;
  activePlacement: string | null;
  onSelect: (placementId: string) => void;
  large?: boolean;
}) {
  const viewBox = mapViewBox(large);
  const marker = project(position, viewBox, 12);
  const floors = [...new Set(halls.map((h) => h.floorLabel))];

  return (
    <div className={large ? "map-board large" : "map-board"}>
      <svg
        className={large ? "map large" : "map"}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        aria-label="展馆平面导航"
        role="group"
      >
        <defs>
          <pattern id="door-hatch" width="4" height="4" patternUnits="userSpaceOnUse">
            <path d="M0 4L4 0" stroke="#8f4634" strokeWidth="1" />
          </pattern>
        </defs>
        {halls.map((hall: Hall) => {
          const corners = hallCorners(hall).map((p) => project(p, viewBox, 12));
          const points = corners.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
          const center = project(localToWorld(hall, { x: 0, z: 0 }), viewBox, 12);
          return (
            <g key={hall.id} className="map-hall">
              <polygon
                points={points}
                fill={hall.palette.floor}
                fillOpacity={0.55}
                stroke="#c9c2ae"
                strokeWidth={1.1}
              />
              <text
                x={center.x}
                y={center.y - 2}
                textAnchor="middle"
                fontSize={large ? 9 : 7}
                fill="#6f6a5b"
                className="map-hall-label"
              >
                {hall.name}
              </text>
              <text
                x={center.x}
                y={center.y + (large ? 9 : 7)}
                textAnchor="middle"
                fontSize={large ? 6 : 5}
                fill="#8b8674"
              >
                {hall.floor}
              </text>
            </g>
          );
        })}
        {portals.map((portal) => {
          const hallA = halls.find((h) => h.id === portal.a.hallId);
          const hallB = halls.find((h) => h.id === portal.b.hallId);
          if (!hallA || !hallB) return null;
          const a = project(sideWorld(hallA, portal.a), viewBox, 12);
          const b = project(sideWorld(hallB, portal.b), viewBox, 12);
          const open = portalIsOpen(portal);
          return (
            <g key={portal.id} className="map-portal">
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={open ? "#a99c78" : "#8f4634"}
                strokeWidth={open ? 3.4 : 2}
                strokeDasharray={open ? undefined : "3 3"}
                strokeLinecap="round"
                opacity={open ? 0.8 : 1}
              />
              {!open && (
                <circle cx={(a.x + b.x) / 2} cy={(a.y + b.y) / 2} r="5" fill="url(#door-hatch)" stroke="#8f4634">
                  <title>{`${portal.name} · ${portal.note || "暂时关闭"}`}</title>
                </circle>
              )}
            </g>
          );
        })}
        {placements.map((p) => {
          const hall = halls.find((h) => h.id === p.hallId);
          if (!hall) return null;
          const at = project(localToWorld(hall, p.position), viewBox, 12);
          const isActive = activePlacement === p.id;
          return (
            <g
              key={p.id}
              onClick={() => onSelect(p.id)}
              role="button"
              tabIndex={0}
              aria-label={`前往${p.label}`}
              className="map-artwork"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(p.id);
                }
              }}
            >
              <circle
                cx={at.x}
                cy={at.y}
                r={isActive ? 8 : 6.4}
                fill={isActive ? "#c5a66d" : "#797c72"}
              />
              <text
                x={at.x}
                y={at.y + 2.4}
                textAnchor="middle"
                fill="white"
                fontSize={6.5}
              >
                {ARTWORK_INDEX[p.artworkId] ?? ""}
              </text>
              <title>{`${placementById(p.id)?.label || ""}`}</title>
            </g>
          );
        })}
        <circle
          data-testid="map-position"
          cx={marker.x}
          cy={marker.y}
          r="4.4"
          fill="#282c26"
          stroke="white"
          strokeWidth="1.8"
        />
      </svg>
      <div className="map-legend">
        <span className="legend-line" /> 通道
        <span className="legend-closed" /> 关闭
        <span className="map-floors">{floors.join(" · ")}</span>
      </div>
    </div>
  );
}
