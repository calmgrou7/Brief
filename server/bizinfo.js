// 기업마당(bizinfo.go.kr) 지원사업 공고 API 연동
// - 인증키 발급: 기업마당 > 정책정보 개방 > API 신청 (무료)
// - 키가 없으면 data/mock-programs.json 으로 동작(개발·시연용)
import fs from 'node:fs';
import path from 'node:path';
import { getDb, json, parseJson } from './db.js';
import { REGIONS } from './catalog.js';

const API_URL = 'https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do';
const BASE = 'https://www.bizinfo.go.kr';

// 기업마당 지원분야 대분류 코드
export const CATEGORY_CODES = {
  '01': '금융', '02': '기술', '03': '인력', '04': '수출', '05': '내수', '06': '창업', '07': '경영', '09': '기타',
};

function extractRegions(text = '') {
  const found = REGIONS.filter((r) => text.includes(r));
  return found.length ? found : ['전국'];
}

function parseEnd(period = '') {
  // "20261101 ~ 20261130" / "2026-11-01 ~ 2026-11-30" / "예산 소진시까지"
  const m = String(period).replace(/-/g, '').match(/(\d{8})\s*$/);
  if (!m) return null;
  const s = m[1];
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

const stripHtml = (s = '') => String(s).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

export function normalize(item, source = 'bizinfo') {
  const tags = item.hashtags || '';
  const title = item.pblancNm || item.title || '';
  const url = item.pblancUrl ? (item.pblancUrl.startsWith('http') ? item.pblancUrl : BASE + item.pblancUrl) : item.url;
  return {
    id: String(item.pblancId || item.id),
    source,
    title,
    agency: item.jrsdInsttNm || item.excInsttNm || item.agency || '',
    category: item.pldirSportRealmLclasCodeNm || item.category || '기타',
    regions: item.regions || extractRegions(`${title} ${tags} ${item.jrsdInsttNm || ''}`),
    tags,
    summary: stripHtml(item.bsnsSumryCn || item.summary || '').slice(0, 300),
    apply_period: item.reqstBeginEndDe || item.apply_period || '',
    apply_end: item.apply_end || parseEnd(item.reqstBeginEndDe),
    url,
    published_at: (item.creatPnttm || item.published_at || new Date().toISOString()).slice(0, 10),
  };
}

export async function fetchPrograms({ categoryCode = '01', count = 100 } = {}) {
  const key = process.env.BIZINFO_API_KEY;
  if (!key) {
    const file = path.resolve('data/mock-programs.json');
    const items = JSON.parse(fs.readFileSync(file, 'utf8'));
    return items.map((i) => normalize(i, 'mock'));
  }
  const qs = new URLSearchParams({ crtfcKey: key, dataType: 'json', searchCnt: String(count) });
  if (categoryCode) qs.set('searchLclasId', categoryCode);
  const res = await fetch(`${API_URL}?${qs}`, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`bizinfo API ${res.status}`);
  const body = await res.json();
  const arr = body.jsonArray || body.items || [];
  return arr.map((i) => normalize(i, 'bizinfo'));
}

// 수집 → DB 저장 (신규만 insert). 반환: 신규 공고 목록
export async function collectPrograms(opts) {
  const db = getDb();
  const items = await fetchPrograms(opts);
  const exists = db.prepare('SELECT 1 FROM programs WHERE id = ?');
  const insert = db.prepare(`INSERT INTO programs
    (id, source, title, agency, category, regions, tags, summary, apply_period, apply_end, url, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const fresh = [];
  for (const p of items) {
    if (!p.id || exists.get(p.id)) continue;
    insert.run(p.id, p.source, p.title, p.agency, p.category, json(p.regions), p.tags, p.summary,
      p.apply_period, p.apply_end, p.url, p.published_at);
    fresh.push(p);
  }
  return fresh;
}

export function rowToProgram(r) {
  return { ...r, regions: parseJson(r.regions, ['전국']) };
}

export function listOpenPrograms({ limit = 50 } = {}) {
  const today = new Date().toISOString().slice(0, 10);
  return getDb().prepare(`SELECT * FROM programs
      WHERE apply_end IS NULL OR apply_end >= ?
      ORDER BY published_at DESC LIMIT ?`).all(today, limit).map(rowToProgram);
}
