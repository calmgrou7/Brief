import { NotionError } from '@/lib/notion';
import Link from 'next/link';
import { NOTION_URLS } from '@/lib/schema';

export function LoadError({ error }: { error: unknown }) {
  const e = error instanceof NotionError ? error : null;
  const msg =
    e?.status === 401 ? 'NOTION_TOKEN이 올바르지 않습니다. 노션 통합(Integration) 토큰을 다시 확인해 주세요.'
    : e?.status === 404 ? '노션 데이터베이스를 찾을 수 없습니다. 노션에서 채움기업컨설팅관리대시보드 페이지 → ··· → 연결 → 만든 통합을 추가해 주세요.'
    : e ? `노션이 오류를 돌려줬습니다(${e.status}): ${e.message}`
    : '노션 서버에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.';
  return (
    <div className="card stack" role="alert">
      <h1 style={{ fontSize: 20 }}>데이터를 불러오지 못했습니다</h1>
      <p>{msg}</p>
      <Link href="/check" className="btn primary" style={{ justifySelf: 'start' }}>연결 점검 열기</Link>
      <p className="small muted">잠시 후 새로고침해 보세요. 계속되면 <a href={NOTION_URLS.home} target="_blank" rel="noreferrer">노션 프로젝트 홈</a>의 연결 상태를 확인해 주세요.</p>
    </div>
  );
}
