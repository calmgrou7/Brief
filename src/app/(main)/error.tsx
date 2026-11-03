'use client';

import Link from 'next/link';

/** 저장·완료 등 서버 동작이 실패했을 때: 성공처럼 보이지 않게 원인과 재시도를 안내 */
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card stack" role="alert">
      <h1 style={{ fontSize: 20 }}>처리하지 못했습니다</h1>
      <p>{error.message || '알 수 없는 오류가 발생했습니다.'}</p>
      <p className="small muted">변경 내용은 저장되지 않았을 수 있습니다. 다시 시도하거나 연결 점검에서 노션 상태를 확인해 주세요.</p>
      <div className="row">
        <button type="button" className="btn primary" onClick={reset}>다시 시도</button>
        <Link href="/check" className="btn">연결 점검</Link>
      </div>
    </div>
  );
}
