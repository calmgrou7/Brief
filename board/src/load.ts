import { parseSummary } from './contract';
import type { LoadState } from './overview';
import type { ServiceDef } from './services';

const TIMEOUT_MS = 10_000;

/** 서비스 하나의 요약을 읽는다. 한 서비스가 실패해도 다른 서비스 타일에는 영향이 없다. */
export async function loadService(s: ServiceDef, now: Date): Promise<LoadState> {
  if (!s.summaryUrl) return { status: 'demo', summary: s.demo(now) };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(s.summaryUrl, { headers: s.summaryHeaders, signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) return { status: 'error', error: `HTTP ${res.status}` };
    return { status: 'ok', summary: parseSummary(await res.json()) };
  } catch (e) {
    const msg = e instanceof DOMException && e.name === 'AbortError' ? '응답 시간 초과' : e instanceof Error ? e.message : String(e);
    return { status: 'error', error: msg };
  } finally {
    clearTimeout(timer);
  }
}
