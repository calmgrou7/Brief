/* 진로산사 메타버스 서버
 * - 정적 파일 제공 (public/)
 * - WebSocket으로 아바타 위치, 채팅, 종소리, 등불(질문 답변) 실시간 중계
 * - 미성년자 안전: 욕설 필터, 전화번호 가리기, 도배 방지, 위기 키워드 감지, 코치의 채팅 금지
 * 데이터는 메모리에만 있고 서버를 재시작하면 사라집니다(테스트 버전). */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");
const WORLD = require("./public/js/world.js");

const PORT = process.env.PORT || 8080;
const COACH_CODE = process.env.COACH_CODE || "sansa-coach";
const ROOM_CAPACITY = Number(process.env.ROOM_CAPACITY || 40);
const PUBLIC = path.join(__dirname, "public");

const QUESTIONS = [
  "시간 가는 줄 모르고 했던 일은 무엇인가요?",
  "친구들이 나에게 자주 부탁하는 것은 무엇인가요?",
  "내 삶에서 가장 중요한 것 한 가지는?",
  "언제 에너지가 차오르나요?",
  "닮고 싶은 사람은 누구이고, 왜 그런가요?",
  "10년 뒤 평범한 하루, 나는 어디서 무엇을 하고 있을까요?",
  "그 모습에 다가가기 위해 이번 주 할 수 있는 가장 작은 한 걸음은?"
];
const dayIndex = () => Math.floor(Date.now() / 86400000) % QUESTIONS.length;

// ---------- 안전 필터 ----------
const BAD_WORDS = ["씨발", "시발", "ㅅㅂ", "ㅆㅂ", "병신", "ㅂㅅ", "개새", "좆", "존나", "지랄", "ㅈㄹ", "미친놈", "미친년",
  "닥쳐", "꺼져", "새끼", "느금", "니애미", "섹스", "fuck", "shit", "bitch"];
const CRISIS_WORDS = ["죽고 싶", "죽고싶", "자살", "자해", "사라지고 싶", "살기 싫", "죽어버"];
function clean(text, max) {
  let t = String(text || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);
  t = t.replace(/01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/g, "***-****-****"); // 전화번호
  const squashed = t.replace(/[\s.\-_*]/g, "").toLowerCase();
  for (const w of BAD_WORDS) {
    if (squashed.includes(w)) {
      t = t.split(w).join("♡".repeat(w.length));
      if (t.replace(/[\s.\-_*]/g, "").toLowerCase().includes(w)) t = "(고운 말로 다시 써볼까요?)";
    }
  }
  return t;
}
const isCrisis = (t) => CRISIS_WORDS.some((w) => t.replace(/\s/g, "").includes(w.replace(/\s/g, "")));

// ---------- 방 ----------
const rooms = new Map(); // roomName -> { players: Map, lanterns: [], notice, question, log: [] }
function getRoom(name) {
  if (!rooms.has(name)) {
    rooms.set(name, { players: new Map(), lanterns: [], notice: "", question: null, log: [], questionDay: dayIndex() });
  }
  const r = rooms.get(name);
  if (r.questionDay !== dayIndex()) { // 날이 바뀌면 등불과 질문 초기화
    r.questionDay = dayIndex(); r.lanterns = []; r.question = null;
  }
  return r;
}
const roomQuestion = (r) => r.question || QUESTIONS[r.questionDay];

function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}
function broadcast(room, msg, filter) {
  const data = JSON.stringify(msg);
  for (const p of room.players.values()) {
    if (p.ws.readyState === 1 && (!filter || filter(p))) p.ws.send(data);
  }
}
const publicPlayer = (p) => ({ id: p.id, nick: p.nick, color: p.color, x: p.x, y: p.y, dir: p.dir, coach: p.coach });

let nextId = 1;

// ---------- HTTP (정적 파일) ----------
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json", ".ico": "image/x-icon" };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/health") { res.writeHead(200); return res.end("ok"); }
  let p = decodeURIComponent(url.pathname);
  if (p.endsWith("/")) p += "index.html";
  const file = path.normalize(path.join(PUBLIC, p));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(buf);
  });
});

// ---------- WebSocket ----------
const wss = new WebSocketServer({ server, path: "/ws", maxPayload: 4096 });
wss.on("connection", (ws) => {
  let me = null;
  let room = null;

  ws.on("message", (raw) => {
    let m;
    try { m = JSON.parse(raw); } catch (e) { return; }
    const now = Date.now();

    if (m.t === "join" && !me) {
      const roomName = clean(m.room || "lobby", 20).replace(/[^\w가-힣-]/g, "") || "lobby";
      room = getRoom(roomName);
      const coach = Boolean(m.coachCode) && m.coachCode === COACH_CODE;
      if (m.coachCode && !coach) return send(ws, { t: "error", text: "코치 코드가 맞지 않아요." });
      if (!coach && [...room.players.values()].filter((p) => !p.coach).length >= ROOM_CAPACITY) {
        return send(ws, { t: "error", text: `이 방은 정원(${ROOM_CAPACITY}명)이 찼어요. 다른 방 이름으로 들어와 주세요.` });
      }
      me = {
        id: nextId++, ws, coach,
        nick: clean(m.nick, 10) || "이름없는 산새",
        color: /^#[0-9a-f]{6}$/i.test(m.color) ? m.color : "#8b6a4e",
        x: WORLD.SPAWN.x * WORLD.T + 16 + (Math.random() * 40 - 20),
        y: WORLD.SPAWN.y * WORLD.T + 16,
        dir: "up", lastChat: 0, lastMove: 0, mutedUntil: 0
      };
      room.players.set(me.id, me);
      send(ws, {
        t: "welcome", id: me.id, coach, room: roomName,
        players: [...room.players.values()].map(publicPlayer),
        lanterns: room.lanterns, notice: room.notice, question: roomQuestion(room)
      });
      broadcast(room, { t: "join", p: publicPlayer(me) }, (p) => p.id !== me.id);
      return;
    }
    if (!me) return;

    switch (m.t) {
      case "move": {
        if (now - me.lastMove < 40) return; // 초당 25회 제한
        const x = Number(m.x), y = Number(m.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        if (Math.hypot(x - me.x, y - me.y) > 120) return; // 순간이동 방지
        if (WORLD.blockedAt(x, y)) return;
        me.x = x; me.y = y; me.lastMove = now;
        me.dir = ["up", "down", "left", "right"].includes(m.dir) ? m.dir : me.dir;
        broadcast(room, { t: "move", id: me.id, x, y, dir: me.dir }, (p) => p.id !== me.id);
        break;
      }
      case "chat": {
        if (me.mutedUntil > now) return send(ws, { t: "system", text: "길잡이가 잠시 채팅을 쉬게 했어요. 조금 뒤에 다시 이야기해요." });
        if (now - me.lastChat < 1000) return send(ws, { t: "system", text: "조금 천천히 이야기해요 🙂" });
        const text = clean(m.text, 80);
        if (!text) return;
        me.lastChat = now;
        const zoneId = WORLD.zoneAt(me.x, me.y);
        const zone = WORLD.ZONES.find((z) => z.id === zoneId);
        const scoped = zone && zone.chat === "zone";
        const msg = { t: "chat", id: me.id, nick: me.nick, coach: me.coach, text, zone: scoped ? zoneId : null, at: now };
        broadcast(room, msg, (p) => !scoped || p.coach || WORLD.zoneAt(p.x, p.y) === zoneId);
        room.log.push(msg); if (room.log.length > 300) room.log.shift();
        if (isCrisis(text)) {
          send(ws, { t: "care" });
          broadcast(room, { t: "system", text: `⚠️ ${me.nick} 님의 메시지에 위기 신호가 있어요. 개별 확인이 필요해요.` }, (p) => p.coach);
        }
        break;
      }
      case "bell": {
        if (WORLD.zoneAt(me.x, me.y) !== "bell") return;
        if (now - (me.lastBell || 0) < 4000) return;
        me.lastBell = now;
        broadcast(room, { t: "bell", id: me.id, nick: me.nick });
        break;
      }
      case "answer": {
        if (WORLD.zoneAt(me.x, me.y) !== "stupa") return;
        if (me.mutedUntil > now) return;
        if (room.lanterns.some((l) => l.ownerId === me.id)) return send(ws, { t: "system", text: "오늘은 이미 등불을 밝혔어요." });
        const text = clean(m.text, 60);
        if (!text) return;
        // 돌탑 주변 빈 자리 찾기
        const z = WORLD.ZONES.find((z) => z.id === "stupa");
        let lx, ly, tries = 0;
        do {
          lx = (z.x + 0.5 + Math.random() * (z.w - 1)) * WORLD.T;
          ly = (z.y + 0.5 + Math.random() * (z.h - 1)) * WORLD.T;
        } while (WORLD.blockedAt(lx, ly, 6) && ++tries < 30);
        const lantern = { id: now + "-" + me.id, ownerId: me.id, nick: me.nick, text, x: lx, y: ly };
        room.lanterns.push(lantern);
        if (room.lanterns.length > 80) room.lanterns.shift();
        broadcast(room, { t: "lantern", lantern });
        if (isCrisis(text)) {
          send(ws, { t: "care" });
          broadcast(room, { t: "system", text: `⚠️ ${me.nick} 님의 등불에 위기 신호가 있어요. 개별 확인이 필요해요.` }, (p) => p.coach);
        }
        break;
      }
      // ----- 코치 전용 -----
      case "notice": {
        if (!me.coach) return;
        room.notice = clean(m.text, 100);
        broadcast(room, { t: "notice", text: room.notice });
        break;
      }
      case "question": {
        if (!me.coach) return;
        const q = clean(m.text, 80);
        if (!q) return;
        room.question = q; room.lanterns = [];
        broadcast(room, { t: "question", text: q, reset: true });
        break;
      }
      case "gather": {
        if (!me.coach) return;
        broadcast(room, { t: "gather", nick: me.nick });
        break;
      }
      case "mute": {
        if (!me.coach) return;
        const target = room.players.get(Number(m.id));
        if (!target || target.coach) return;
        target.mutedUntil = now + 5 * 60 * 1000;
        send(target.ws, { t: "system", text: "길잡이가 5분 동안 채팅을 쉬게 했어요." });
        send(ws, { t: "system", text: `${target.nick} 님의 채팅을 5분간 멈췄어요.` });
        break;
      }
      case "removeLantern": {
        if (!me.coach) return;
        room.lanterns = room.lanterns.filter((l) => l.id !== m.id);
        broadcast(room, { t: "removeLantern", id: m.id });
        break;
      }
    }
  });

  ws.on("close", () => {
    if (me && room) {
      room.players.delete(me.id);
      broadcast(room, { t: "leave", id: me.id });
    }
  });
});

// 연결 유지 확인 (끊긴 소켓 정리)
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);
wss.on("connection", (ws) => { ws.isAlive = true; ws.on("pong", () => (ws.isAlive = true)); });

server.listen(PORT, () => {
  console.log(`진로산사 메타버스: http://localhost:${PORT}`);
  if (!process.env.COACH_CODE) console.log("⚠️  COACH_CODE 환경변수가 없어 기본 코치 코드(sansa-coach)를 사용합니다. 배포 전에 꼭 바꾸세요.");
});
