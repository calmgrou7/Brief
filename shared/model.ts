// 브릿지노드 대시보드 공통 모델: 타입·상수·순수 계산 함수 (서버/화면/테스트 공용)

export type TrackKey = "mini" | "web" | "toss";
export type ReleaseStatus =
  "prep" | "requested" | "review" | "rejected" | "approved" | "released";
export type ReleaseKind = "first" | "update" | "hotfix";
export type AccountCategory =
  "toss" | "domain" | "server" | "store" | "dev" | "pay" | "etc";
export type RecordKind = "projects" | "releases" | "domains" | "servers";

export interface Stage {
  label: string;
  done: boolean;
}
export interface Project {
  id: string;
  name: string;
  client: string;
  type: TrackKey;
  hold: boolean;
  stages: Stage[];
  startDate: string;
  dueDate: string;
  nextStep: string;
  serviceUrl: string;
  repoUrl: string;
  memo: string;
}
export interface Release {
  id: string;
  projectId: string;
  version: string;
  buildNo: string;
  kind: ReleaseKind;
  status: ReleaseStatus;
  date: string;
  server: string;
  note: string;
}
export interface Domain {
  id: string;
  name: string;
  registrar: string;
  registeredAt: string;
  expiresAt: string;
  sslExpiresAt: string;
  autoRenew: boolean;
  projectId: string;
  dns: string;
  memo: string;
}
export interface Server {
  id: string;
  name: string;
  provider: string;
  host: string;
  ip: string;
  purpose: string;
  plan: string;
  cost: number;
  renewAt: string;
  projectId: string;
  consoleUrl: string;
  memo: string;
}
/** 계정 보관함 평문 — 브라우저 메모리에만 존재. 서버로 보내지 않는다. */
export interface Account {
  id: string;
  service: string;
  category: AccountCategory;
  url: string;
  username: string;
  password: string;
  projectId: string;
  changedAt: string;
  memo: string;
}
/** 서버에 저장되는 보관함 암호문 */
export interface VaultBlob {
  v: 1;
  kdf: "PBKDF2-SHA256";
  iter: number;
  salt: string;
  iv: string;
  ct: string;
}
export interface DashboardState {
  version: 1;
  meta: { sample?: boolean; updatedAt?: string };
  projects: Project[];
  releases: Release[];
  domains: Domain[];
  servers: Server[];
  vault: VaultBlob | null;
}

export const TRACKS: Record<
  TrackKey,
  { label: string; color: string; stages: string[] }
> = {
  mini: {
    label: "미니앱",
    color: "var(--mini)",
    stages: ["기획", "디자인", "개발", "테스트", "플랫폼 심사", "출시"],
  },
  web: {
    label: "웹앱",
    color: "var(--web)",
    stages: ["기획", "디자인", "개발", "서버·도메인 연결", "QA", "오픈"],
  },
  toss: {
    label: "토스 인앱",
    color: "var(--toss)",
    stages: [
      "기획",
      "디자인(TDS)",
      "SDK 연동 개발",
      "샌드박스 테스트",
      "검수 요청",
      "출시",
    ],
  },
};
export const REL_STATUS: Record<ReleaseStatus, { label: string; tone: Tone }> =
  {
    prep: { label: "준비중", tone: "mute" },
    requested: { label: "검수요청", tone: "info" },
    review: { label: "검수중", tone: "warn" },
    rejected: { label: "반려", tone: "bad" },
    approved: { label: "승인", tone: "acc" },
    released: { label: "출시완료", tone: "ok" },
  };
export const REL_KIND: Record<ReleaseKind, string> = {
  first: "최초 출시",
  update: "업데이트",
  hotfix: "핫픽스",
};
export const ACC_CAT: Record<AccountCategory, string> = {
  toss: "토스 콘솔",
  domain: "도메인",
  server: "서버/호스팅",
  store: "스토어/플랫폼",
  dev: "개발도구",
  pay: "결제/PG",
  etc: "기타",
};
export type Tone = "ok" | "warn" | "bad" | "info" | "acc" | "mute";
export const RECORD_KINDS: RecordKind[] = [
  "projects",
  "releases",
  "domains",
  "servers",
];

/* ---------- 날짜 ---------- */
export function todayStr(now = new Date()): string {
  return new Date(now.getTime() - now.getTimezoneOffset() * 6e4)
    .toISOString()
    .slice(0, 10);
}
export function daysUntil(date: string, today = todayStr()): number | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return Math.round(
    (Date.parse(date + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) /
      864e5,
  );
}
export const dday = (n: number | null) =>
  n == null ? "" : n === 0 ? "D-DAY" : n > 0 ? `D-${n}` : `D+${-n}`;
export function ddayTone(n: number | null, warn = 60, bad = 30): Tone {
  if (n == null) return "mute";
  return n <= bad ? "bad" : n <= warn ? "warn" : "ok";
}

/* ---------- 진행률·상태 ---------- */
export function stagesFor(type: TrackKey, doneCount = 0): Stage[] {
  return TRACKS[type].stages.map((label, i) => ({
    label,
    done: i < doneCount,
  }));
}
export function progress(p: Pick<Project, "stages">): number {
  const s = p.stages || [];
  return s.length
    ? Math.round((s.filter((x) => x.done).length / s.length) * 100)
    : 0;
}
export const average = (xs: number[]) =>
  xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0;
export function currentStage(p: Pick<Project, "stages">): string {
  return p.stages.find((x) => !x.done)?.label ?? "완료";
}
export function projectReleases(releases: Release[], pid: string): Release[] {
  return releases
    .filter((r) => r.projectId === pid)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}
export function releasedCount(releases: Release[], pid: string): number {
  return releases.filter((r) => r.projectId === pid && r.status === "released")
    .length;
}
export function currentVersion(
  releases: Release[],
  pid: string,
): string | null {
  return (
    projectReleases(releases, pid).find((r) => r.status === "released")
      ?.version ?? null
  );
}
export function updateLabel(releases: Release[], pid: string): string {
  const n = releasedCount(releases, pid);
  return n === 0 ? "미출시" : n === 1 ? "최초 출시" : `${n - 1}차 업데이트`;
}
export type ProjectStatusKey =
  "hold" | "review" | "rejected" | "live" | "planning" | "progress";
export const PROJECT_STATUS: Record<
  ProjectStatusKey,
  { label: string; tone: Tone }
> = {
  planning: { label: "기획중", tone: "info" },
  progress: { label: "진행중", tone: "acc" },
  review: { label: "검수중", tone: "warn" },
  rejected: { label: "반려 대응", tone: "bad" },
  live: { label: "출시·운영중", tone: "ok" },
  hold: { label: "보류", tone: "mute" },
};
export function projectStatus(
  p: Project,
  releases: Release[],
): ProjectStatusKey {
  if (p.hold) return "hold";
  const latest = projectReleases(releases, p.id)[0];
  if (latest && (latest.status === "requested" || latest.status === "review"))
    return "review";
  if (latest && latest.status === "rejected") return "rejected";
  if (releasedCount(releases, p.id) > 0 && progress(p) === 100) return "live";
  if (!p.stages[0]?.done) return "planning";
  return "progress";
}

/* ---------- 다음 절차 자동 집계 ---------- */
export interface NextAction {
  icon: string;
  title: string;
  sub: string;
  date: string;
  tag: string;
  tone: Tone;
}
export function nextActions(
  s: DashboardState,
  today = todayStr(),
): NextAction[] {
  const items: NextAction[] = [];
  for (const p of s.projects) {
    if (p.hold) continue;
    const st = PROJECT_STATUS[projectStatus(p, s.releases)];
    if (p.nextStep)
      items.push({
        icon: "▶",
        title: p.nextStep,
        sub: `${p.name} · 현재 단계: ${currentStage(p)}`,
        date: p.dueDate,
        tag: st.label,
        tone: st.tone,
      });
    const lr = projectReleases(s.releases, p.id)[0];
    if (!lr) continue;
    if (lr.status === "requested" || lr.status === "review")
      items.push({
        icon: "⏳",
        title: `v${lr.version} 검수 결과 확인`,
        sub: `${p.name} · ${REL_STATUS[lr.status].label}`,
        date: lr.date,
        tag: "검수",
        tone: "warn",
      });
    if (lr.status === "rejected")
      items.push({
        icon: "⚠",
        title: `v${lr.version} 반려 사유 확인·수정 후 재요청`,
        sub: p.name,
        date: lr.date,
        tag: "반려",
        tone: "bad",
      });
    if (lr.status === "approved")
      items.push({
        icon: "🚀",
        title: `v${lr.version} 승인됨 → 출시 처리`,
        sub: p.name,
        date: lr.date,
        tag: "승인",
        tone: "acc",
      });
  }
  for (const d of s.domains) {
    const n = daysUntil(d.expiresAt, today);
    if (n != null && n <= 60)
      items.push({
        icon: "🌐",
        title: `도메인 갱신: ${d.name}`,
        sub: `${d.registrar}${d.autoRenew ? " · 자동갱신 ON" : " · 자동갱신 OFF"}`,
        date: d.expiresAt,
        tag: dday(n),
        tone: n <= 30 ? "bad" : "warn",
      });
    const ssl = daysUntil(d.sslExpiresAt, today);
    if (ssl != null && ssl <= 30)
      items.push({
        icon: "🔒",
        title: `SSL 인증서 갱신: ${d.name}`,
        sub: "인증서 만료 임박",
        date: d.sslExpiresAt,
        tag: dday(ssl),
        tone: "bad",
      });
  }
  for (const v of s.servers) {
    const n = daysUntil(v.renewAt, today);
    if (n != null && n <= 30)
      items.push({
        icon: "🖥",
        title: `서버 결제/갱신: ${v.name}`,
        sub: `${v.provider} · ${won(v.cost)}`,
        date: v.renewAt,
        tag: dday(n),
        tone: n <= 7 ? "bad" : "warn",
      });
  }
  return items.sort((a, b) =>
    (a.date || "9999").localeCompare(b.date || "9999"),
  );
}
export const won = (n: number) =>
  n ? Number(n).toLocaleString("ko-KR") + "원" : "-";

/* ---------- 입력 정규화 (서버 저장 전 화이트리스트) ---------- */
const str = (v: unknown, max = 500) =>
  typeof v === "string"
    ? v.trim().slice(0, max)
    : v == null
      ? ""
      : String(v).slice(0, max);
const date = (v: unknown) =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "";
const pick = <T extends string>(
  v: unknown,
  allowed: readonly T[],
  fallback: T,
): T => (allowed.includes(v as T) ? (v as T) : fallback);

export function sanitize(
  kind: RecordKind,
  raw: any,
  id: string,
): Project | Release | Domain | Server {
  const r = raw && typeof raw === "object" ? raw : {};
  switch (kind) {
    case "projects": {
      const type = pick(r.type, ["mini", "web", "toss"] as const, "toss");
      const template = TRACKS[type].stages;
      const given: unknown[] = Array.isArray(r.stages) ? r.stages : [];
      const stages = template.map((label, i) => ({
        label,
        done: !!(given[i] as any)?.done,
      }));
      return {
        id,
        type,
        stages,
        name: str(r.name, 120) || "이름 없음",
        client: str(r.client, 120),
        hold: !!r.hold,
        startDate: date(r.startDate),
        dueDate: date(r.dueDate),
        nextStep: str(r.nextStep, 300),
        serviceUrl: str(r.serviceUrl, 500),
        repoUrl: str(r.repoUrl, 500),
        memo: str(r.memo, 2000),
      };
    }
    case "releases":
      return {
        id,
        projectId: str(r.projectId, 64),
        version: str(r.version, 40) || "0.0.0",
        buildNo: str(r.buildNo, 40),
        kind: pick(r.kind, ["first", "update", "hotfix"] as const, "update"),
        status: pick(
          r.status,
          [
            "prep",
            "requested",
            "review",
            "rejected",
            "approved",
            "released",
          ] as const,
          "prep",
        ),
        date: date(r.date),
        server: str(r.server, 120),
        note: str(r.note, 2000),
      };
    case "domains":
      return {
        id,
        name: str(r.name, 253) || "domain",
        registrar: str(r.registrar, 120),
        registeredAt: date(r.registeredAt),
        expiresAt: date(r.expiresAt),
        sslExpiresAt: date(r.sslExpiresAt),
        autoRenew: !!r.autoRenew,
        projectId: str(r.projectId, 64),
        dns: str(r.dns, 120),
        memo: str(r.memo, 2000),
      };
    case "servers":
      return {
        id,
        name: str(r.name, 120) || "server",
        provider: str(r.provider, 120),
        host: str(r.host, 253),
        ip: str(r.ip, 64),
        purpose: str(r.purpose, 200),
        plan: str(r.plan, 200),
        cost: Math.max(0, Math.round(Number(r.cost) || 0)),
        renewAt: date(r.renewAt),
        projectId: str(r.projectId, 64),
        consoleUrl: str(r.consoleUrl, 500),
        memo: str(r.memo, 2000),
      };
  }
}

/** 보관함은 암호문 형식만 허용 (평문 필드가 섞이면 거부) */
export function validVault(v: any): v is VaultBlob {
  if (!v || typeof v !== "object") return false;
  const keys = Object.keys(v).sort().join(",");
  if (keys !== "ct,iter,iv,kdf,salt,v") return false;
  const b64 = (s: unknown, max: number) =>
    typeof s === "string" && s.length <= max && /^[A-Za-z0-9+/=]+$/.test(s);
  return (
    v.v === 1 &&
    v.kdf === "PBKDF2-SHA256" &&
    Number.isInteger(v.iter) &&
    v.iter >= 100000 &&
    b64(v.salt, 64) &&
    b64(v.iv, 32) &&
    b64(v.ct, 2_000_000)
  );
}

/* ---------- 출시 이력 병합 (자동화 입력) ---------- */
export interface ReleaseImport {
  projectId?: string;
  projectName?: string;
  version?: string;
  [k: string]: unknown;
}
export function planReleaseMerge(
  projects: Project[],
  existing: Release[],
  incoming: ReleaseImport[],
  newId: () => string,
  today = todayStr(),
) {
  const upserts: Release[] = [];
  let added = 0,
    updated = 0,
    skipped = 0;
  const pool = [...existing];
  for (const r of incoming) {
    const strip = (n: string) => n.replace(/\s*\(예시\)$/, "");
    const p = r.projectId
      ? projects.find((x) => x.id === r.projectId)
      : projects.find(
          (x) => x.name === r.projectName || strip(x.name) === r.projectName,
        );
    if (!p || !r.version) {
      skipped++;
      continue;
    }
    const ex = pool.find(
      (x) => x.projectId === p.id && x.version === r.version,
    );
    const { projectName: _drop, ...rest } = r;
    const base = ex ?? { date: today, kind: "update", status: "prep" };
    const rec = sanitize(
      "releases",
      { ...base, ...rest, projectId: p.id },
      ex?.id ?? newId(),
    ) as Release;
    if (ex) {
      Object.assign(ex, rec);
      updated++;
    } else {
      pool.push(rec);
      added++;
    }
    upserts.push(rec);
  }
  return { upserts, added, updated, skipped };
}

/* ---------- 예시 데이터 ---------- */
export function sampleState(newId: () => string): DashboardState {
  const [p1, p2, p3, p4] = [newId(), newId(), newId(), newId()];
  const proj = (
    id: string,
    type: TrackKey,
    done: number,
    o: Partial<Project>,
  ): Project => ({
    id,
    type,
    stages: stagesFor(type, done),
    hold: false,
    client: "",
    startDate: "",
    dueDate: "",
    nextStep: "",
    serviceUrl: "",
    repoUrl: "",
    memo: "",
    name: "",
    ...o,
  });
  return {
    version: 1,
    meta: { sample: true },
    projects: [
      proj(p1, "toss", 6, {
        name: "동네가게 예약 (예시)",
        client: "A상점",
        startDate: "2026-07-01",
        dueDate: "2026-11-20",
        nextStep: "v1.2.0 검수 결과 확인 후 출시 공지",
        memo: "토스 콘솔 앱 ID 기입",
      }),
      proj(p2, "mini", 3, {
        name: "포인트 적립 미니앱 (예시)",
        client: "B브랜드",
        startDate: "2026-09-15",
        dueDate: "2026-12-15",
        nextStep: "내부 테스트 시나리오 작성 및 QA 시작",
      }),
      proj(p3, "web", 4, {
        name: "회사 소개 웹앱 (예시)",
        client: "C법인",
        startDate: "2026-08-10",
        dueDate: "2026-11-10",
        nextStep: "SSL 적용 확인 → QA 체크리스트 진행",
        serviceUrl: "https://example.com",
      }),
      proj(p4, "toss", 1, {
        name: "쿠폰 이벤트 (예시)",
        client: "D카페",
        startDate: "2026-10-20",
        dueDate: "2027-01-31",
        nextStep: "TDS 기반 화면 설계서 확정",
      }),
    ],
    releases: [
      {
        id: newId(),
        projectId: p1,
        version: "1.0.0",
        kind: "first",
        date: "2026-09-01",
        status: "released",
        buildNo: "12",
        server: "NCP Prod #1",
        note: "최초 출시",
      },
      {
        id: newId(),
        projectId: p1,
        version: "1.1.0",
        kind: "update",
        date: "2026-10-02",
        status: "released",
        buildNo: "18",
        server: "NCP Prod #1",
        note: "예약 알림 추가",
      },
      {
        id: newId(),
        projectId: p1,
        version: "1.2.0",
        kind: "update",
        date: "2026-10-28",
        status: "review",
        buildNo: "23",
        server: "NCP Prod #1",
        note: "결제 연동(토스페이) 추가",
      },
      {
        id: newId(),
        projectId: p3,
        version: "0.9.0",
        kind: "first",
        date: "2026-10-25",
        status: "prep",
        buildNo: "",
        server: "Vercel",
        note: "스테이징 배포",
      },
    ],
    domains: [
      {
        id: newId(),
        name: "example-shop.kr",
        registrar: "가비아",
        registeredAt: "2025-11-20",
        expiresAt: "2026-11-20",
        autoRenew: false,
        sslExpiresAt: "2026-12-01",
        projectId: p1,
        dns: "Cloudflare",
        memo: "",
      },
      {
        id: newId(),
        name: "example.com",
        registrar: "후이즈",
        registeredAt: "2024-03-02",
        expiresAt: "2027-03-02",
        autoRenew: true,
        sslExpiresAt: "2027-01-15",
        projectId: p3,
        dns: "후이즈 DNS",
        memo: "",
      },
    ],
    servers: [
      {
        id: newId(),
        name: "NCP Prod #1",
        provider: "네이버클라우드",
        host: "api.example-shop.kr",
        ip: "0.0.0.0",
        purpose: "API 서버",
        plan: "Standard 2vCPU/4GB",
        cost: 55000,
        renewAt: "2026-11-30",
        projectId: p1,
        consoleUrl: "",
        memo: "",
      },
      {
        id: newId(),
        name: "Vercel",
        provider: "Vercel",
        host: "example.vercel.app",
        ip: "",
        purpose: "프론트 호스팅",
        plan: "Pro",
        cost: 28000,
        renewAt: "2026-11-15",
        projectId: p3,
        consoleUrl: "",
        memo: "",
      },
    ],
    vault: null,
  };
}
