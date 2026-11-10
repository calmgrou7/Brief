/* 진로산사 메타버스 — 맵 정의 (브라우저와 서버가 함께 사용)
 * 타일 단위 좌표. 1타일 = 32px. 맵을 바꾸려면 이 파일만 수정하면 됩니다. */
(function (root, factory) {
  const w = factory();
  if (typeof module === "object" && module.exports) module.exports = w;
  else root.SANSA_WORLD = w;
})(typeof self !== "undefined" ? self : this, function () {
  const T = 32;
  const COLS = 40;
  const ROWS = 30;

  // 구역(zone): 들어가면 기능이 생기는 영역. chat: "zone"이면 그 안의 사람끼리만 대화
  const ZONES = [
    { id: "hall", name: "길잡이 법당", x: 12, y: 9, w: 16, h: 4, chat: "all",
      desc: "코치(길잡이)와 함께 이야기 나누는 곳이에요" },
    { id: "bell", name: "종각", x: 2, y: 11, w: 10, h: 3, chat: "all",
      desc: "종을 치면 모두에게 종소리가 울려요" },
    { id: "stupa", name: "생각의 돌탑", x: 15, y: 13, w: 10, h: 8, chat: "all",
      desc: "오늘의 질문에 답하면 돌탑 곁에 등불이 켜져요" },
    { id: "pine", name: "솔바람 정자", x: 30, y: 4, w: 8, h: 7, chat: "zone",
      desc: "정자 안에 있는 사람들끼리만 대화가 보여요" },
    { id: "moon", name: "달빛 정자", x: 2, y: 18, w: 8, h: 7, chat: "zone",
      desc: "정자 안에 있는 사람들끼리만 대화가 보여요" }
  ];

  // 충돌(지나갈 수 없는) 사각형
  const BLOCKS = [
    // 담장 (아래쪽 가운데는 산문)
    { x: 0, y: 0, w: 40, h: 1, kind: "wall" },
    { x: 0, y: 0, w: 1, h: 30, kind: "wall" },
    { x: 39, y: 0, w: 1, h: 30, kind: "wall" },
    { x: 0, y: 29, w: 18, h: 1, kind: "wall" },
    { x: 22, y: 29, w: 18, h: 1, kind: "wall" },
    // 건물
    { x: 14, y: 2, w: 12, h: 7, kind: "hall" },
    { x: 4, y: 7, w: 6, h: 4, kind: "bellhouse" },
    { x: 19, y: 15, w: 2, h: 3, kind: "stupa" },
    { x: 28, y: 19, w: 9, h: 6, kind: "pond" },
    // 정자 기둥
    { x: 30, y: 4, w: 1, h: 1, kind: "pillar" }, { x: 37, y: 4, w: 1, h: 1, kind: "pillar" },
    { x: 30, y: 10, w: 1, h: 1, kind: "pillar" }, { x: 37, y: 10, w: 1, h: 1, kind: "pillar" },
    { x: 2, y: 18, w: 1, h: 1, kind: "pillar" }, { x: 9, y: 18, w: 1, h: 1, kind: "pillar" },
    { x: 2, y: 24, w: 1, h: 1, kind: "pillar" }, { x: 9, y: 24, w: 1, h: 1, kind: "pillar" },
    // 나무
    { x: 3, y: 2, w: 1, h: 1, kind: "tree" }, { x: 7, y: 3, w: 1, h: 1, kind: "tree" },
    { x: 11, y: 4, w: 1, h: 1, kind: "tree" }, { x: 29, y: 2, w: 1, h: 1, kind: "tree" },
    { x: 34, y: 13, w: 1, h: 1, kind: "tree" }, { x: 37, y: 16, w: 1, h: 1, kind: "tree" },
    { x: 13, y: 24, w: 1, h: 1, kind: "tree" }, { x: 26, y: 25, w: 1, h: 1, kind: "tree" },
    { x: 4, y: 15, w: 1, h: 1, kind: "tree" }, { x: 30, y: 15, w: 1, h: 1, kind: "tree" },
    { x: 15, y: 27, w: 1, h: 1, kind: "tree" }, { x: 24, y: 27, w: 1, h: 1, kind: "tree" }
  ];

  const SPAWN = { x: 20, y: 27 }; // 산문 바로 안쪽

  // 타일 단위 충돌 격자
  const grid = [];
  for (let y = 0; y < ROWS; y++) {
    grid.push(new Array(COLS).fill(0));
  }
  BLOCKS.forEach((b) => {
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) grid[y][x] = 1;
  });

  function blockedTile(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
    return grid[ty][tx] === 1;
  }

  // 픽셀 좌표(px)에서 아바타 발밑 원(반지름 r)이 막히는지
  function blockedAt(px, py, r) {
    r = r || 10;
    const pts = [[px - r, py - r / 2], [px + r, py - r / 2], [px - r, py + r / 2], [px + r, py + r / 2]];
    return pts.some(([x, y]) => blockedTile(Math.floor(x / T), Math.floor(y / T)));
  }

  function zoneAt(px, py) {
    const tx = px / T, ty = py / T;
    const z = ZONES.find((z) => tx >= z.x && tx < z.x + z.w && ty >= z.y && ty < z.y + z.h);
    return z ? z.id : null;
  }

  // 타일 BFS 길찾기 (탭해서 이동)
  function findPath(sx, sy, gx, gy) {
    if (blockedTile(gx, gy)) return null;
    const key = (x, y) => y * COLS + x;
    const prev = new Map([[key(sx, sy), -1]]);
    const q = [[sx, sy]];
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (q.length) {
      const [x, y] = q.shift();
      if (x === gx && y === gy) {
        const path = [];
        let k = key(x, y);
        while (k !== -1) { path.unshift([k % COLS, Math.floor(k / COLS)]); k = prev.get(k); }
        return path;
      }
      for (const [dx, dy] of dirs) {
        const nx = x + dx, ny = y + dy;
        if (!blockedTile(nx, ny) && !prev.has(key(nx, ny))) { prev.set(key(nx, ny), key(x, y)); q.push([nx, ny]); }
      }
    }
    return null;
  }

  return { T, COLS, ROWS, ZONES, BLOCKS, SPAWN, blockedTile, blockedAt, zoneAt, findPath,
           W: COLS * T, H: ROWS * T };
});
