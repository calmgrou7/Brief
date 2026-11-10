/* 실시간 함께하기: Supabase Realtime Presence(동시 접속) + Broadcast(종소리)
 * 주고받는 데이터는 자동 닉네임과 '종을 쳤다'는 신호뿐입니다. 답변 내용은 절대 전송하지 않습니다. */
window.SansaRealtime = (function () {
  const cfg = window.SANSA_CONFIG || {};
  let channel = null;
  let handlers = { count: () => {}, bell: () => {} };

  function enabled() {
    return Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
  }

  function loadSdk() {
    return new Promise((resolve, reject) => {
      if (window.supabase) return resolve(window.supabase);
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";
      s.onload = () => resolve(window.supabase);
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function joinRoom(client, nick, roomNo) {
    const ch = client.channel("jinro-sansa-room-" + roomNo, {
      config: { presence: { key: nick + "-" + Math.random().toString(36).slice(2, 7) }, broadcast: { self: false } }
    });
    return new Promise((resolve) => {
      ch.on("presence", { event: "sync" }, () => {
        handlers.count(Object.keys(ch.presenceState()).length, roomNo);
      })
        .on("broadcast", { event: "bell" }, (msg) => handlers.bell(msg.payload || {}))
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await ch.track({ nick, at: Date.now() });
            resolve(ch);
          }
        });
    });
  }

  async function connect(nick, h) {
    handlers = Object.assign(handlers, h);
    if (!enabled()) return false;
    try {
      const sb = await loadSdk();
      const client = sb.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
      // 정원이 차면 다음 방으로 (최대 50개 방까지 탐색)
      for (let room = 1; room <= 50; room++) {
        const ch = await joinRoom(client, nick, room);
        const n = Object.keys(ch.presenceState()).length;
        if (n <= (cfg.ROOM_CAPACITY || 100)) {
          channel = ch;
          handlers.count(n, room);
          return true;
        }
        await client.removeChannel(ch);
      }
    } catch (e) {
      console.warn("실시간 연결 실패, 혼자 모드로 진행합니다.", e);
    }
    return false;
  }

  function ringBell(nick) {
    if (channel) channel.send({ type: "broadcast", event: "bell", payload: { nick } });
  }

  return { enabled, connect, ringBell };
})();
