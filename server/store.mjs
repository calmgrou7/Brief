import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import {
  RECORD_KINDS,
  sanitize,
  validVault,
  planReleaseMerge,
  sampleState,
} from "../shared/model.ts";

export class ServiceError extends Error {
  constructor(code, status = 400) {
    super(code);
    this.status = status;
  }
}

export class Store {
  constructor(path = ":memory:", { seed = true } = {}) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL;
 CREATE TABLE IF NOT EXISTS records(kind TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,updated TEXT NOT NULL,PRIMARY KEY(kind,id));
 CREATE TABLE IF NOT EXISTS vault(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL,updated TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY,event TEXT NOT NULL,detail TEXT NOT NULL,created TEXT NOT NULL);`);
    if (seed && !this.getMeta("initialized")) {
      this.replaceAll(sampleState(randomUUID), "seed");
    }
  }
  close() {
    this.db.close();
  }

  /* ---------- meta / audit ---------- */
  getMeta(key) {
    const row = this.db.prepare("SELECT value FROM meta WHERE key=?").get(key);
    return row ? JSON.parse(row.value) : undefined;
  }
  setMeta(key, value) {
    this.db
      .prepare(
        "INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      )
      .run(key, JSON.stringify(value));
  }
  audit(event, detail = {}) {
    // 보관함 내용·비밀번호는 절대 기록하지 않는다 (종류·ID만)
    this.db
      .prepare("INSERT INTO audit VALUES(?,?,?,?)")
      .run(
        randomUUID(),
        event,
        JSON.stringify(detail),
        new Date().toISOString(),
      );
  }
  auditLog(limit = 50) {
    return this.db
      .prepare(
        "SELECT event,detail,created FROM audit ORDER BY created DESC LIMIT ?",
      )
      .all(limit)
      .map((r) => ({ ...r, detail: JSON.parse(r.detail) }));
  }
  touch() {
    this.setMeta("updatedAt", new Date().toISOString());
  }

  /* ---------- 상태 ---------- */
  state() {
    const out = {
      version: 1,
      meta: {
        sample: !!this.getMeta("sample"),
        updatedAt: this.getMeta("updatedAt"),
      },
      vault: null,
    };
    for (const kind of RECORD_KINDS) out[kind] = this.list(kind);
    const v = this.db.prepare("SELECT data FROM vault WHERE id=1").get();
    out.vault = v ? JSON.parse(v.data) : null;
    return out;
  }
  list(kind) {
    this.assertKind(kind);
    return this.db
      .prepare("SELECT data FROM records WHERE kind=? ORDER BY rowid")
      .all(kind)
      .map((r) => JSON.parse(r.data));
  }
  assertKind(kind) {
    if (!RECORD_KINDS.includes(kind))
      throw new ServiceError("UNKNOWN_KIND", 404);
  }

  /* ---------- 레코드 CRUD ---------- */
  upsert(kind, id, raw) {
    this.assertKind(kind);
    if (!/^[A-Za-z0-9-]{1,64}$/.test(id)) throw new ServiceError("BAD_ID");
    const rec = sanitize(kind, raw, id);
    if (kind === "releases" && !this.exists("projects", rec.projectId))
      throw new ServiceError("PROJECT_NOT_FOUND");
    this.db
      .prepare(
        "INSERT INTO records(kind,id,data,updated) VALUES(?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data,updated=excluded.updated",
      )
      .run(kind, id, JSON.stringify(rec), new Date().toISOString());
    this.setMeta("sample", false);
    this.touch();
    this.audit("upsert", { kind, id });
    return rec;
  }
  exists(kind, id) {
    return !!this.db
      .prepare("SELECT 1 FROM records WHERE kind=? AND id=?")
      .get(kind, id);
  }
  remove(kind, id) {
    this.assertKind(kind);
    const r = this.db
      .prepare("DELETE FROM records WHERE kind=? AND id=?")
      .run(kind, id);
    if (!r.changes) throw new ServiceError("NOT_FOUND", 404);
    if (kind === "projects") {
      // 프로젝트 삭제 시 출시 이력도 함께 삭제
      for (const rel of this.list("releases").filter((x) => x.projectId === id))
        this.db
          .prepare("DELETE FROM records WHERE kind='releases' AND id=?")
          .run(rel.id);
    }
    this.touch();
    this.audit("delete", { kind, id });
  }

  /* ---------- 보관함 (암호문만) ---------- */
  setVault(blob) {
    if (blob === null) {
      this.db.prepare("DELETE FROM vault WHERE id=1").run();
      this.audit("vault.delete");
      return null;
    }
    if (!validVault(blob)) throw new ServiceError("INVALID_VAULT");
    this.db
      .prepare(
        "INSERT INTO vault(id,data,updated) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated=excluded.updated",
      )
      .run(JSON.stringify(blob), new Date().toISOString());
    this.touch();
    this.audit("vault.save");
    return blob;
  }

  /* ---------- 일괄 교체 / 가져오기 ---------- */
  replaceAll(data, reason = "restore", { keepVault = false } = {}) {
    const d = data && typeof data === "object" ? data : {};
    if (d.vault != null && !validVault(d.vault))
      throw new ServiceError("INVALID_VAULT");
    this.db.exec("BEGIN");
    try {
      this.db.prepare("DELETE FROM records").run();
      for (const kind of RECORD_KINDS) {
        for (const raw of Array.isArray(d[kind]) ? d[kind] : []) {
          const id =
            typeof raw?.id === "string" && /^[A-Za-z0-9-]{1,64}$/.test(raw.id)
              ? raw.id
              : randomUUID();
          this.db
            .prepare(
              "INSERT OR REPLACE INTO records(kind,id,data,updated) VALUES(?,?,?,?)",
            )
            .run(
              kind,
              id,
              JSON.stringify(sanitize(kind, raw, id)),
              new Date().toISOString(),
            );
        }
      }
      if (!keepVault) {
        this.db.prepare("DELETE FROM vault WHERE id=1").run();
        if (d.vault)
          this.db
            .prepare("INSERT INTO vault(id,data,updated) VALUES(1,?,?)")
            .run(JSON.stringify(d.vault), new Date().toISOString());
      }
      this.setMeta("sample", !!d.meta?.sample);
      this.setMeta("initialized", true);
      this.touch();
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
    this.audit("replaceAll", { reason });
    return this.state();
  }
  reset(mode) {
    if (mode === "sample")
      return this.replaceAll(sampleState(randomUUID), "reset.sample", {
        keepVault: true,
      });
    if (mode === "empty")
      return this.replaceAll({}, "reset.empty", { keepVault: true });
    throw new ServiceError("BAD_MODE");
  }
  /** 백업 파일: projects 가 있으면 전체 복원, releases 만 있으면 출시 이력 병합 */
  importData(d) {
    if (d && Array.isArray(d.projects))
      return { mode: "restore", state: this.replaceAll(d, "import") };
    if (d && Array.isArray(d.releases)) {
      const plan = planReleaseMerge(
        this.list("projects"),
        this.list("releases"),
        d.releases.slice(0, 1000),
        randomUUID,
      );
      for (const r of plan.upserts) this.upsert("releases", r.id, r);
      this.audit("import.releases", {
        added: plan.added,
        updated: plan.updated,
        skipped: plan.skipped,
      });
      return {
        mode: "merge",
        added: plan.added,
        updated: plan.updated,
        skipped: plan.skipped,
        state: this.state(),
      };
    }
    throw new ServiceError("UNKNOWN_FORMAT");
  }

  /* ---------- 세션 ---------- */
  createSession(id, hours) {
    this.db.prepare("DELETE FROM sessions WHERE expires<?").run(Date.now());
    this.db
      .prepare("INSERT INTO sessions VALUES(?,?)")
      .run(id, Date.now() + hours * 3600e3);
  }
  validSession(id) {
    if (!id) return false;
    const row = this.db
      .prepare("SELECT expires FROM sessions WHERE id=?")
      .get(id);
    return !!row && row.expires > Date.now();
  }
  endSession(id) {
    this.db.prepare("DELETE FROM sessions WHERE id=?").run(id);
  }
}
