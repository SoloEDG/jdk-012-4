import type { Artwork, Hall, Placement, Portal, Route } from "./types";

/**
 * Artwork identity is global: a work can be hung in several halls at once.
 * Position and orientation live on Placement, never on the work itself.
 */
export const artworks: Artwork[] = [
  {
    id: "a1",
    title: "山的另一种记忆",
    en: "MEMORY OF THE MOUNTAIN",
    artist: "林知远",
    year: "2025",
    medium: "生成艺术 / 数字微喷",
    color: "#a7c4ac",
    description:
      "山并非静止的风景，而是时间缓慢折叠后的形状。艺术家将地形数据转译成层叠的色域，让记忆在虚实之间生长。",
    transcript: [
      "请在这幅作品前稍作停留。层层叠叠的山脊，来自艺术家对故乡的记忆。",
      "画面中的每一条曲线，都是数据与情感的一次相遇。",
      "当你移动视线，山的轮廓也会在想象中重新组合。",
    ],
    duration: 42,
  },
  {
    id: "a2",
    title: "无声的潮汐",
    en: "A SILENT TIDE",
    artist: "陈以宁",
    year: "2024",
    medium: "算法绘画 / 光场",
    color: "#b9b6d6",
    description:
      "海浪被拆解为无数细小的光线，涨落不再有声音，只留下颜色的呼吸。这是一段关于消逝与重返的观察。",
    transcript: [
      "这里的海没有声音。",
      "艺术家捕捉了潮水退去后留下的纹理，将它们化成紫色的光。",
      "不妨想象，下一次潮汐到来之前，时间是什么形状。",
    ],
    duration: 36,
  },
  {
    id: "a3",
    title: "日光的切片",
    en: "FRAGMENTS OF LIGHT",
    artist: "周弥",
    year: "2025",
    medium: "数字构成 / 色彩研究",
    color: "#e1a474",
    description:
      "午后的光被截取、平移、重新排列。几何之间的空白，让日常的温度成为可观看的结构。主展厅与光影厅各陈列着它的一处切片，中间隔着一道回声门廊。",
    transcript: [
      "这件作品记录了一整个下午的阳光。",
      "暖色的块面是时间留下的切片，边缘的阴影则标记着移动。",
      "你看到的是光，也可能是自己的某个午后。",
    ],
    duration: 39,
  },
  {
    id: "a4",
    title: "浮游之城",
    en: "A FLOATING CITY",
    artist: "何序",
    year: "2023",
    medium: "程序生成 / 建筑幻想",
    color: "#85b9c1",
    description:
      "城市被从地表轻轻托起，建筑像群岛一样悬浮。失去重力后，我们如何重新理解彼此的距离？一层的光影厅与二层的阁楼各陈列着它的一个版本。",
    transcript: [
      "欢迎来到一座没有地面的城市。",
      "建筑以不可能的方式相连，像记忆中不断重写的街道。",
      "在这里，距离不再由地图决定。",
    ],
    duration: 45,
  },
  {
    id: "a5",
    title: "夜的生长",
    en: "GROWING IN THE DARK",
    artist: "许眠",
    year: "2024",
    medium: "粒子艺术 / 数字绘画",
    color: "#9ba46a",
    description:
      "微小的光点在黑暗中聚集，形成介于植物与星系之间的生命。生长不需要被看见，却一直发生。光影厅与阁楼各有一处陈列。",
    transcript: [
      "把视线放慢，你会看到黑暗也在生长。",
      "每一个光点都遵循简单的规则，而它们共同形成了复杂的生命。",
      "这是一次关于偶然与秩序的实验。",
    ],
    duration: 33,
  },
  {
    id: "a6",
    title: "时间的容器",
    en: "VESSELS OF TIME",
    artist: "苏望",
    year: "2025",
    medium: "三维雕塑 / 形态实验",
    color: "#d5c6b4",
    description:
      "重复的圆环并不通向同一个终点。虚拟雕塑以不可能的空间关系，邀请你重新感受时间的流向。主展厅与阁楼各陈列着一件。",
    transcript: [
      "时间能被装进一个容器吗？",
      "这些圆环彼此穿过，却始终保留独立的方向。",
      "绕行，停留，或者回望，都可以成为你理解这件作品的方式。",
    ],
    duration: 48,
  },
  {
    id: "a7",
    title: "回声之井",
    en: "WELL OF ECHOES",
    artist: "黎照",
    year: "2026",
    medium: "声音装置 / 空间实验",
    color: "#9db1a6",
    description:
      "一口向下的井收集着整栋建筑的脚步声。声音在井壁间往返，渐渐失去原来的方向，只剩温度。它陈列在负一层的下沉中庭，通道目前正在检修。",
    transcript: [
      "这里收集着整栋建筑的脚步。",
      "声音顺着井壁下落，再带着一点改变回到你身边。",
      "你听见的，也许不是回声，而是空间在回应你。",
    ],
    duration: 40,
  },
];

/**
 * Halls. Geometry (width/depth, artwork positions and portal thresholds) is
 * authored in each hall's own local space; the walls sit exactly on
 * x = ±width/2 and z = ±depth/2. `origin`, `rotation` and `scale` map that
 * local space into the shared world plan. These values were checked so that
 * no two halls overlap and every doorway faces the hall across its corridor.
 */
export const halls: Hall[] = [
  {
    id: "main",
    name: "主展厅",
    en: "MAIN GALLERY",
    floor: "1F",
    floorLabel: "一层",
    origin: { x: 0, z: 0 },
    rotation: 0,
    scale: 1,
    elevation: 0,
    width: 12,
    depth: 16,
    height: 5.8,
    bounds: { minX: -5.5, maxX: 5.5, minZ: -7.5, maxZ: 7.5 },
    obstacle: { minX: -1.3, maxX: 1.3, minZ: -1.45, maxZ: 0.85 },
    spawn: { x: 3, z: 6.2 },
    spawnYaw: 0,
    palette: {
      background: "#d7d5ce",
      fog: "#d7d5ce",
      floor: "#b4b0a7",
      wall: "#e2ded4",
      accent: "#b7b4aa",
    },
  },
  {
    id: "light",
    name: "光影厅",
    en: "LIGHT HALL",
    floor: "1F",
    floorLabel: "一层",
    origin: { x: 13, z: -3 },
    rotation: 0.12,
    scale: 1.05,
    elevation: 0,
    width: 10,
    depth: 14,
    height: 5.2,
    bounds: { minX: -4.5, maxX: 4.5, minZ: -6.5, maxZ: 6.5 },
    obstacle: { minX: -1.1, maxX: 1.1, minZ: -0.9, maxZ: 0.9 },
    spawn: { x: -3.4, z: -1.5 },
    spawnYaw: -Math.PI / 2,
    palette: {
      background: "#c7d2d0",
      fog: "#c7d2d0",
      floor: "#a6b3b0",
      wall: "#dde5e1",
      accent: "#93a8a4",
    },
  },
  {
    id: "attic",
    name: "阁楼",
    en: "THE ATTIC",
    floor: "2F",
    floorLabel: "二层",
    origin: { x: 4, z: 17 },
    rotation: 0.15,
    scale: 0.92,
    elevation: 1.6,
    width: 12,
    depth: 16,
    height: 4.8,
    bounds: { minX: -5.5, maxX: 5.5, minZ: -7.5, maxZ: 7.5 },
    obstacle: { minX: -0.9, maxX: 0.9, minZ: -0.9, maxZ: 0.9 },
    spawn: { x: 1.5, z: -6.9 },
    spawnYaw: Math.PI,
    palette: {
      background: "#cabfab",
      fog: "#cabfab",
      floor: "#b3a48b",
      wall: "#ddd2bd",
      accent: "#a8916d",
    },
  },
  {
    id: "cellar",
    name: "下沉中庭",
    en: "SUNKEN COURT",
    floor: "B1",
    floorLabel: "负一层",
    origin: { x: -9, z: 16 },
    rotation: 0.1,
    scale: 0.8,
    elevation: -1.4,
    width: 8,
    depth: 10,
    height: 4.2,
    bounds: { minX: -3.5, maxX: 3.5, minZ: -4.5, maxZ: 4.5 },
    obstacle: { minX: -1.6, maxX: 1.6, minZ: -1.6, maxZ: 1.6 },
    spawn: { x: 0, z: 3.2 },
    spawnYaw: 0,
    palette: {
      background: "#3d453f",
      fog: "#3d453f",
      floor: "#596158",
      wall: "#69736a",
      accent: "#8d9b8e",
    },
  },
];

export const placements: Placement[] = [
  // 主展厅 · 一层
  {
    id: "pa1-main",
    artworkId: "a1",
    hallId: "main",
    position: { x: -5.4, z: -4 },
    facing: Math.PI / 2,
    label: "西墙 · 山脊长卷",
  },
  {
    id: "pa2-main",
    artworkId: "a2",
    hallId: "main",
    position: { x: 0, z: -7.4 },
    facing: 0,
    label: "北墙 · 潮汐主屏",
  },
  {
    id: "pa3-main",
    artworkId: "a3",
    hallId: "main",
    position: { x: 5.4, z: -4.5 },
    facing: -Math.PI / 2,
    label: "东墙 · 午后切片",
  },
  {
    id: "pa6-main",
    artworkId: "a6",
    hallId: "main",
    position: { x: 0, z: 5.5 },
    facing: Math.PI,
    label: "南墙 · 时间装置",
  },
  // 光影厅 · 一层（a3 / a4 / a5 的另一处陈列）
  {
    id: "pa3-light",
    artworkId: "a3",
    hallId: "light",
    position: { x: -4.4, z: -4.5 },
    facing: Math.PI / 2,
    label: "天窗回廊 · 光的变奏",
  },
  {
    id: "pa4-light",
    artworkId: "a4",
    hallId: "light",
    position: { x: 4.4, z: -4.5 },
    facing: -Math.PI / 2,
    label: "东墙 · 悬浮群岛",
  },
  {
    id: "pa5-light",
    artworkId: "a5",
    hallId: "light",
    position: { x: 0, z: 6.2 },
    facing: Math.PI,
    label: "南墙 · 夜光花园",
  },
  // 阁楼 · 二层（a4 / a5 / a6 的第二个陈列）
  {
    id: "pa4-attic",
    artworkId: "a4",
    hallId: "attic",
    position: { x: -5.4, z: 3.2 },
    facing: Math.PI / 2,
    label: "阁楼西窗 · 浮城回望",
  },
  {
    id: "pa5-attic",
    artworkId: "a5",
    hallId: "attic",
    position: { x: 5.4, z: -3 },
    facing: -Math.PI / 2,
    label: "阁楼东廊 · 微光生长",
  },
  {
    id: "pa6-attic",
    artworkId: "a6",
    hallId: "attic",
    position: { x: 3.2, z: -7.4 },
    facing: 0,
    label: "阁楼北墙 · 圆环回声",
  },
  // 下沉中庭 · 负一层（唯一通道暂时关闭）
  {
    id: "pa7-cellar",
    artworkId: "a7",
    hallId: "cellar",
    position: { x: 0, z: -4.4 },
    facing: 0,
    label: "中庭 · 回声之井",
  },
];

/**
 * Portals are authored per side, in each hall's local space. `normal`
 * always points from the threshold into that hall, so arriving walkers
 * can be placed and turned into the room without consulting the world plan.
 */
export const portals: Portal[] = [
  {
    id: "p-main-light",
    name: "回声门廊",
    a: {
      hallId: "main",
      position: { x: 6, z: -1 },
      normal: { x: -1, z: 0 },
      width: 2.4,
    },
    b: {
      hallId: "light",
      position: { x: -5, z: -1.5 },
      normal: { x: 1, z: 0 },
      width: 2.4,
    },
  },
  {
    id: "p-main-attic",
    name: "缓阶楼梯",
    a: {
      hallId: "main",
      position: { x: 2.5, z: 8 },
      normal: { x: 0, z: -1 },
      width: 2.2,
    },
    b: {
      hallId: "attic",
      position: { x: 1.5, z: -8 },
      normal: { x: 0, z: 1 },
      width: 2.2,
    },
  },
  {
    id: "p-light-attic",
    name: "天窗连桥",
    a: {
      hallId: "light",
      position: { x: -4, z: 7 },
      normal: { x: 0, z: -1 },
      width: 2,
    },
    b: {
      hallId: "attic",
      position: { x: 4.6, z: -8 },
      normal: { x: 0, z: 1 },
      width: 2,
    },
  },
  {
    id: "p-attic-cellar",
    name: "检修旋梯",
    closed: true,
    note: "回廊检修中，暂时关闭",
    a: {
      hallId: "attic",
      position: { x: -6, z: 2 },
      normal: { x: 1, z: 0 },
      width: 2,
    },
    b: {
      hallId: "cellar",
      position: { x: 4, z: 0 },
      normal: { x: -1, z: 0 },
      width: 2,
    },
  },
];

/**
 * Curated routes stop at placements, not artworks: the same work hung in
 * two halls is two different stops, and the tour can cross floors.
 */
export const routes: Route[] = [
  {
    id: "nature",
    name: "自然的回响",
    subtitle: "从主展厅的山与潮汐，拾级而上到阁楼的微光",
    stops: ["pa1-main", "pa2-main", "pa5-attic"],
  },
  {
    id: "space",
    name: "空间的诗学",
    subtitle: "穿过光影厅与阁楼，在环路中辨认同一件作品",
    stops: ["pa3-light", "pa4-attic", "pa6-main"],
  },
  {
    id: "echo",
    name: "光的回声",
    subtitle: "由主展厅向地下走去；部分门户仍在检修",
    stops: ["pa3-main", "pa7-cellar", "pa6-attic"],
  },
];

export const artworkById = (id: string | null) =>
  artworks.find((a) => a.id === id);
export const hallById = (id: string | null) =>
  halls.find((h) => h.id === id);
export const placementById = (id: string | null) =>
  placements.find((p) => p.id === id);
export const placementsByArtwork = (artworkId: string) =>
  placements.filter((p) => p.artworkId === artworkId);
export const placementsInHall = (hallId: string) =>
  placements.filter((p) => p.hallId === hallId);
export const portalById = (id: string | null) =>
  portals.find((p) => p.id === id);
export const portalsInHall = (hallId: string) =>
  portals.filter((p) => p.a.hallId === hallId || p.b.hallId === hallId);
export const routeById = (id: string | null) =>
  routes.find((r) => r.id === id);
