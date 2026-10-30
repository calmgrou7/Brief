import "server-only";
import postgres from "postgres";

// Supabase(Postgres) 연결. DATABASE_URL이 없으면 null이고, 각 저장소는 로컬 파일로 대신 저장한다.
// Supabase 대시보드 > Connect > "Transaction pooler" 연결 문자열을 쓴다 (서버리스 배포에 맞음).

let client: postgres.Sql | null | undefined;

export function db(): postgres.Sql | null {
  if (client !== undefined) return client;
  const url = process.env.DATABASE_URL;
  // transaction pooler는 prepared statement를 지원하지 않는다
  client = url ? postgres(url, { prepare: false, max: 5, idle_timeout: 20 }) : null;
  return client;
}
