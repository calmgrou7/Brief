export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(code);
  }
}
export async function api<T = any>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const res = await fetch("/api/" + path, {
    method,
    headers:
      method === "GET"
        ? {}
        : { "Content-Type": "application/json", "X-BN-Request": "1" },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || "SERVER_ERROR", res.status);
  return data;
}
export const ERROR_TEXT: Record<string, string> = {
  INVALID_PASSWORD: "비밀번호가 올바르지 않습니다.",
  TOO_MANY_ATTEMPTS: "시도 횟수를 초과했습니다. 10분 후 다시 시도하세요.",
  UNAUTHORIZED: "로그인이 만료되었습니다.",
  PROJECT_NOT_FOUND: "프로젝트를 찾을 수 없습니다.",
  INVALID_VAULT: "보관함 형식이 올바르지 않습니다.",
  UNKNOWN_FORMAT: "알 수 없는 파일 형식입니다.",
  TOO_LARGE: "파일이 너무 큽니다.",
  INVALID_JSON: "JSON 형식이 올바르지 않습니다.",
};
export const errorText = (e: unknown) =>
  e instanceof ApiError
    ? ERROR_TEXT[e.code] || `오류: ${e.code}`
    : "서버에 연결할 수 없습니다.";
