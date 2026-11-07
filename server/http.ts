/** 외부 호출 공통: 10초 제한, 키 비노출 오류 */

export class UpstreamError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

export const PROVIDER_TIMEOUT_MS = 10_000;

export async function getJson(fetcher: Fetcher, url: string, init: RequestInit, label: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetcher(url, { ...init, signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS) });
  } catch (e) {
    const timeout = (e as Error)?.name === "TimeoutError";
    throw new UpstreamError(timeout ? "TIMEOUT" : "NETWORK", `${label} ${timeout ? "시간 초과" : "연결 실패"}`);
  }
  const text = await res.text();
  if (!res.ok) throw new UpstreamError(`HTTP_${res.status}`, `${label} HTTP ${res.status}`);
  try {
    return JSON.parse(text);
  } catch {
    // data.go.kr은 인증 오류 시 XML을 돌려준다. 본문은 키가 섞일 수 있어 기록하지 않는다.
    throw new UpstreamError("NOT_JSON", `${label} JSON 아님 (인증키·활용신청 상태 확인)`);
  }
}
