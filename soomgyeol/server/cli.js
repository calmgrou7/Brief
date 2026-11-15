"use strict";
/* 운영 도구: 관리자 지정, 데모 데이터 */
const path = require("node:path");
const dbm = require("./db");
const auth = require("./auth");

const db = dbm.open(process.env.DB_PATH || path.join(__dirname, "..", "data", "soomgyeol.db"));
const [cmd, arg] = process.argv.slice(2);

if (cmd === "make-admin") {
  const email = auth.normalizeEmail(arg);
  const r = db.run("UPDATE users SET role='admin' WHERE email=?", email);
  console.log(r.changes ? `${email} 에게 관리자 권한을 부여했습니다.` : `${email} 회원이 없습니다. 먼저 가입해 주세요.`);
} else if (cmd === "seed-demo") {
  // 데모 데이터: 이메일이 @demo.soomgyeol 로 끝나 실제 회원과 구분됩니다.
  const now = Date.now(), DAY = 86400000;
  const pats = ["coherent", "box", "sigh", "lava", "478", "nadi"];
  for (let i = 1; i <= 12; i++) {
    const email = `user${i}@demo.soomgyeol`;
    if (db.one("SELECT id FROM users WHERE email=?", email)) continue;
    const created = now - (14 - i) * DAY;
    const uid = Number(db.run("INSERT INTO users(email,pw_hash,name,created_at) VALUES(?,?,?,?)", email, auth.hashPassword("demo-password"), `데모${i}`, created).lastInsertRowid);
    db.run("INSERT INTO events(user_id,type,created_at) VALUES(?,?,?)", uid, "signup", created);
    for (let k = 0; k < (i % 5) + 1; k++) {
      const t = created + k * DAY / 2 + 3600000;
      if (t > now) break;
      const p = pats[(i + k) % 3];
      db.run(`INSERT INTO breath_sessions(user_id,pattern,planned_sec,actual_sec,cycles,status,counted,usage_day,feeling_before,feeling_after,started_at,ended_at)
              VALUES(?,?,180,180,11,'completed',1,?,2,4,?,?)`, uid, p, new Date(t).toISOString().slice(0, 10), t, t + 180000);
      db.run("INSERT INTO events(user_id,type,created_at) VALUES(?,?,?)", uid, "session_complete", t + 180000);
    }
  }
  console.log("데모 회원 12명과 호흡 기록을 만들었습니다 (비밀번호: demo-password).");
} else {
  console.log("사용법: node server/cli.js make-admin <email> | seed-demo");
}
