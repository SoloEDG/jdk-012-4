import { useState } from "react";
import {
  ArrowUpRight,
  Heart,
  Maximize,
  MapPin,
  Volume2,
  Compass,
  Move,
  Info,
  X,
} from "lucide-react";
import { Viewport, Map } from "../features/space";
import { ArtworkList, ArtworkDetail } from "../features/catalog";
import { TourPanel } from "../features/tours";
import { AudioPlayer } from "../features/narration";
import { CollectionPanel } from "../features/collection";
import {
  artworks,
  artworkById,
  hallById,
  halls,
  placementById,
} from "../shared/catalog";
import { useGallery } from "./useGallery";
export default function App() {
  const g = useGallery();
  const [tab, setTab] = useState("explore");
  const [mapOpen, setMapOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [side, setSide] = useState("works");
  const activePlacement = placementById(g.catalog.active);
  const activeHall = activePlacement
    ? hallById(activePlacement.hallId)
    : g.currentHall;
  const nearbyPlacement = placementById(g.catalog.nearby);
  return (
    <div className="app">
      <header>
        <a className="brand" href="#">
          <span className="brand-mark">余</span>
          <span>
            余境<small>YUJING ART SPACE</small>
          </span>
        </a>
        <nav>
          <button
            className={tab === "explore" ? "selected" : ""}
            onClick={() => setTab("explore")}
          >
            探索展馆
          </button>
          <button
            className={tab === "journeys" ? "selected" : ""}
            onClick={() => setTab("journeys")}
          >
            主题导览
          </button>
          <button
            className={tab === "collection" ? "selected" : ""}
            onClick={() => setTab("collection")}
          >
            我的收藏{" "}
            <span className="count">
              {g.collection.document.favorites.length}
            </span>
          </button>
        </nav>
        <div className="header-meta">
          <span className="live-dot" />
          线上展览 · 全天开放
          <button
            className="icon-button"
            aria-label="操作帮助"
            onClick={() => setHelp(true)}
          >
            <Info size={18} />
          </button>
        </div>
      </header>
      <main>
        <aside className="left-sidebar">
          <div className="exhibition-intro">
            <div className="eyebrow">
              CURRENT EXHIBITION <span>展览 001</span>
            </div>
            <h1>万物之间</h1>
            <p className="english-title">BETWEEN ALL THINGS</p>
            <p className="intro-text">
              当自然、空间与想象相遇
              <br />
              一场不受边界限制的艺术漫游。
            </p>
            <div className="exhibition-meta">
              <span>{artworks.length} 件作品</span>
              <span>{halls.length} 个展厅 · 3 层</span>
              <span>约 18 分钟</span>
            </div>
          </div>
          <div className="sidebar-tabs">
            <button
              className={side === "works" ? "active" : ""}
              onClick={() => setSide("works")}
            >
              展出作品 <small>{String(artworks.length).padStart(2, "0")}</small>
            </button>
            <button
              className={side === "map" ? "active" : ""}
              onClick={() => setSide("map")}
            >
              空间地图
            </button>
          </div>
          {side === "works" ? (
            <ArtworkList
              active={g.catalog.active}
              currentHallId={g.currentHall?.id ?? null}
              onSelect={g.go}
            />
          ) : (
            <Map
              position={g.walker.position}
              activePlacement={g.catalog.active}
              onSelect={g.go}
              large
            />
          )}
          <TourPanel
            state={g.tour.state}
            onStart={g.startTour}
            onPause={g.pauseTour}
            onResume={g.resumeTour}
            onStop={g.stopTour}
            onNext={g.nextTour}
            onRetry={g.retryTour}
          />
          <div className="sidebar-footer">
            <Compass size={15} />
            <span>慢下来，遇见艺术的另一面。</span>
          </div>
        </aside>
        <section className="center">
          <div className="view-heading">
            <div>
              <span className="eyebrow">THE VIRTUAL GALLERY</span>
              <h2>
                步入一场艺术的漫游
                <span>
                  {g.currentHall
                    ? `${g.currentHall.floor} / ${g.currentHall.name}`
                    : "穿行于展厅之间"}
                </span>
              </h2>
            </div>
            <button className="text-button" onClick={() => setHelp(true)}>
              参观指南
              <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="scene-wrap">
            <Viewport
              position={g.walker.positionRef}
              yaw={g.walker.yaw}
              elevation={g.walker.elevationRef}
              hallId={g.walker.hallId}
              onSelect={g.go}
              onLook={g.pauseForLook}
            />
            <div className="scene-top">
              <span>
                <span className="live-dot" />
                自由探索中
              </span>
              <button
                className="glass-button"
                aria-label="全屏展馆"
                onClick={() => {
                  const el = document.querySelector(".scene-wrap");
                  if (document.fullscreenElement)
                    void document.exitFullscreen();
                  else void el?.requestFullscreen();
                }}
              >
                <Maximize size={16} />
              </button>
            </div>
            <div className="center-cross">+</div>
            <div className="scene-location">
              <MapPin size={15} />
              {nearbyPlacement
                ? artworkById(nearbyPlacement.artworkId)?.title
                : g.currentHall
                  ? `${g.currentHall.name} · ${g.currentHall.floorLabel}`
                  : g.currentCorridor
                    ? `穿过 ${g.currentCorridor.name}`
                    : "展厅之间"}
              <small>
                {nearbyPlacement
                  ? `${activeHall?.name} · ${nearbyPlacement.label} · 可收听讲解`
                  : g.currentCorridor
                    ? g.currentCorridor.closed
                      ? g.currentCorridor.note || "通道暂时关闭"
                      : "继续向前，便会抵达另一个展厅"
                    : g.tour.state.phase === "blocked"
                      ? g.tour.state.note
                      : "WASD 行走 · 穿过门户可前往其他展厅"}
              </small>
            </div>
            <div
              className="mini-map"
              onClick={() => setMapOpen(true)}
              role="button"
              tabIndex={0}
              aria-label="展开地图"
              onKeyDown={(e) => {
                if (e.key === "Enter") setMapOpen(true);
              }}
            >
              <span>空间导航 ↗</span>
              <Map
                position={g.walker.position}
                activePlacement={g.catalog.active}
                onSelect={g.go}
              />
            </div>
            <div className="scene-controls">
              <span>
                <kbd>W</kbd>
                <kbd>A</kbd>
                <kbd>S</kbd>
                <kbd>D</kbd> 行走
              </span>
              <span>
                <Move size={14} />
                拖动切换视角
              </span>
              <span>
                <Heart size={14} />
                收藏所见
              </span>
            </div>
          </div>
          <div className="scene-caption">
            <span>让每一次停留，都成为一次发现。</span>
            <span>
              沉浸式三维艺术体验 <Volume2 size={14} />
            </span>
          </div>
          <div className="discover-strip">
            <div>
              <span className="eyebrow">A MOMENT OF DISCOVERY</span>
              <h3>不止于观看，更在于感受。</h3>
              <p>走近一件作品，听一段故事。让艺术与此刻的你，产生连接。</p>
            </div>
            <button
              onClick={() => {
                g.tour.start("nature");
                setTab("journeys");
              }}
            >
              开启主题之旅 <ArrowUpRight size={19} />
            </button>
          </div>
          <div className="art-tags">
            {artworks.slice(0, 3).map((art, i) => (
              <button key={art.id} onClick={() => g.go(art.id)}>
                <span style={{ background: art.color }} />0{i + 1} · {art.title}
                <ArrowUpRight size={14} />
              </button>
            ))}
          </div>
        </section>
        <aside className="right-sidebar">
          {tab === "collection" ? (
            <CollectionPanel
              document={g.collection.document}
              onSelect={g.go}
              onNote={g.collection.note}
              onToggle={g.collection.toggle}
            />
          ) : tab === "journeys" ? (
            <>
              <div className="journey-intro">
                <div className="eyebrow">FOLLOW YOUR CURIOSITY</div>
                <h2>沿着共鸣，出发。</h2>
                <p>选择一条路线，空间导航与作品讲解将陪伴你完成这段旅程。</p>
              </div>
              <TourPanel
                state={g.tour.state}
                onStart={g.startTour}
                onPause={g.pauseTour}
                onResume={g.resumeTour}
                onStop={g.stopTour}
                onNext={g.nextTour}
                onRetry={g.retryTour}
              />
            </>
          ) : (
            <ArtworkDetail
              placementId={g.catalog.active}
              saved={
                !!activePlacement &&
                g.collection.document.favorites.includes(activePlacement.artworkId)
              }
              onFavorite={() => {
                if (activePlacement?.artworkId)
                  g.collection.toggle(activePlacement.artworkId);
              }}
              onListen={() => {
                if (activePlacement?.artworkId)
                  g.narration.play(activePlacement.artworkId);
              }}
              onGo={() => {
                if (activePlacement) g.go(activePlacement.id);
              }}
            />
          )}
          <div className="right-bottom">
            <span className="quote-mark">“</span>
            <p>
              艺术不是你看到的东西，
              <br />
              而是你让别人看到的东西。
            </p>
            <small>— 埃德加 · 德加</small>
          </div>
        </aside>
      </main>
      {g.notice && (
        <div className="scene-notice" role="status">
          <Info size={15} />
          <span>{g.notice}</span>
          <button onClick={g.dismissNotice} aria-label="关闭提示">
            <X size={14} />
          </button>
        </div>
      )}
      {g.collection.storageError && (
        <div className="storage-error">
          浏览器存储已满，本次更改暂未保存，请下载回顾。
        </div>
      )}
      <AudioPlayer
        state={g.narration.state}
        caption={g.narration.caption}
        supported={g.narration.supported}
        onToggle={g.narration.toggle}
        onSeek={g.narration.seek}
        onRate={g.narration.rate}
      />
      {(mapOpen || help) && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setMapOpen(false);
            setHelp(false);
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={help ? "参观指南" : "空间导航"}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              aria-label="关闭弹窗"
              className="icon-button modal-close"
              onClick={() => {
                setMapOpen(false);
                setHelp(false);
              }}
            >
              <X size={20} />
            </button>
            <div className="eyebrow">YUJING ART SPACE</div>
            <h2>{help ? "按照自己的节奏，探索。" : "你在这里。"}</h2>
            {help ? (
              <>
                <p>
                  使用 W / A / S / D 或方向键自由行走；拖动画面转动视角。四个展厅由门廊相连，穿过门廊可以继续走向其他楼层，镜头不会跳切。
                </p>
                <p>
                  点击画中的作品或左侧列表自动前往；同一件作品若在不同展厅陈列，列表会分别标出各自的陈列位置。
                </p>
                <p>
                  主题导览按“陈列”逐站前往并开始讲解。行走途中拖动画面对话或按下方向键，导览会暂停；面板里也可以随时改走另一条路线。
                </p>
                <p>
                  门户可能形成环路，也可能暂时关闭。若目的陈列无法抵达，你会留在原地并看到原因，只有真正走进的展厅才会计入参观回顾。
                </p>
                <p>
                  收藏与感想属于作品本身，讲解也随作品播放；参观回顾会记录你在哪些展厅看过它。讲解由设备的中文语音合成播放，没有中文语音时仍可阅读同步字幕。
                </p>
              </>
            ) : (
              <Map
                position={g.walker.position}
                activePlacement={g.catalog.active}
                onSelect={(id) => {
                  g.go(id);
                  setMapOpen(false);
                }}
                large
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
