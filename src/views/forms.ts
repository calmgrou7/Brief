import {
  TRACKS,
  REL_KIND,
  REL_STATUS,
  ACC_CAT,
  type DashboardState,
} from "../../shared/model.ts";
import type { Field } from "../ui";

const projOpts = (s: DashboardState, none = true): [string, string][] => [
  ...(none ? ([["", "선택 안 함"]] as [string, string][]) : []),
  ...s.projects.map((p) => [p.id, p.name] as [string, string]),
];

export const projectFields = (): Field[] => [
  { k: "name", l: "프로젝트명", req: true, full: true },
  { k: "client", l: "고객사" },
  {
    k: "type",
    l: "구분",
    t: "select",
    o: Object.entries(TRACKS).map(([k, t]) => [k, t.label]),
  },
  { k: "startDate", l: "시작일", t: "date" },
  { k: "dueDate", l: "마감(목표 출시)일", t: "date" },
  { k: "nextStep", l: "다음 절차", full: true, ph: "예: 검수 요청서 제출" },
  { k: "serviceUrl", l: "서비스 URL", ph: "https://" },
  { k: "repoUrl", l: "저장소 URL", ph: "https://github.com/..." },
  { k: "hold", l: "보류 처리", t: "check" },
  { k: "memo", l: "메모 (토스 앱 ID, 담당자 등)", t: "area", full: true },
];
export const releaseFields = (s: DashboardState): Field[] => [
  {
    k: "projectId",
    l: "프로젝트",
    t: "select",
    o: projOpts(s, false),
    req: true,
    full: true,
  },
  { k: "version", l: "버전", req: true, ph: "1.0.0" },
  { k: "buildNo", l: "빌드/배포 번호" },
  { k: "kind", l: "구분", t: "select", o: Object.entries(REL_KIND) },
  {
    k: "status",
    l: "상태",
    t: "select",
    o: Object.entries(REL_STATUS).map(([k, v]) => [k, v.label]),
  },
  { k: "date", l: "제출/배포일", t: "date" },
  { k: "server", l: "배포 서버", ph: "서버 이름" },
  { k: "note", l: "변경 내용", t: "area", full: true },
];
export const domainFields = (s: DashboardState): Field[] => [
  { k: "name", l: "도메인", req: true, ph: "example.co.kr" },
  { k: "registrar", l: "등록기관", ph: "가비아, 후이즈, Cloudflare..." },
  { k: "registeredAt", l: "등록일", t: "date" },
  { k: "expiresAt", l: "만료일", t: "date", req: true },
  { k: "sslExpiresAt", l: "SSL 만료일", t: "date" },
  { k: "autoRenew", l: "자동갱신", t: "check" },
  { k: "projectId", l: "연결 프로젝트", t: "select", o: projOpts(s) },
  { k: "dns", l: "DNS 관리처" },
  { k: "memo", l: "메모", t: "area", full: true },
];
export const serverFields = (s: DashboardState): Field[] => [
  { k: "name", l: "이름", req: true },
  { k: "provider", l: "제공사", ph: "AWS, NCP, Render, Vercel..." },
  { k: "host", l: "호스트/도메인" },
  { k: "ip", l: "IP" },
  { k: "purpose", l: "용도" },
  { k: "plan", l: "플랜/사양" },
  { k: "cost", l: "월 비용(원)", t: "number" },
  { k: "renewAt", l: "다음 결제·갱신일", t: "date" },
  { k: "projectId", l: "연결 프로젝트", t: "select", o: projOpts(s) },
  { k: "consoleUrl", l: "관리 콘솔 URL", ph: "https://" },
  {
    k: "memo",
    l: "메모 (접속 방법 등 — 비밀번호는 보관함에)",
    t: "area",
    full: true,
  },
];
export const accountFields = (s: DashboardState): Field[] => [
  { k: "service", l: "서비스명", req: true, ph: "앱인토스 콘솔" },
  { k: "category", l: "분류", t: "select", o: Object.entries(ACC_CAT) },
  { k: "url", l: "로그인 URL", full: true, ph: "https://" },
  { k: "username", l: "아이디", req: true },
  { k: "password", l: "비밀번호", t: "password" },
  { k: "projectId", l: "연결 프로젝트", t: "select", o: projOpts(s) },
  { k: "changedAt", l: "비밀번호 변경일", t: "date" },
  { k: "memo", l: "메모 (2단계 인증, 담당자 등)", t: "area", full: true },
];
