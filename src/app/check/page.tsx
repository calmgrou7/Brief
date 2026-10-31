import type { Metadata } from 'next';
import Link from 'next/link';
import { checkConnection } from '@/lib/repo';
import { NOTION_URLS } from '@/lib/schema';

export const metadata: Metadata = { title: '연결 점검' };
export const dynamic = 'force-dynamic';

export default async function Check() {
  const result = await checkConnection();
  const ok = result?.every((r) => r.ok);
  return (
    <main className="main" style={{ margin: '0 auto', maxWidth: 960 }}>
    <div className="stack">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div><h1>노션 연결 점검</h1><p>노션 데이터베이스 8개에 접근되는지, 속성 이름·종류가 맞는지 확인합니다.</p></div>
        <div className="row"><Link href="/" className="btn">대시보드로</Link><Link href="/check" className="btn primary">다시 점검</Link></div>
      </div>
      {result === null ? (
        <p className="notice demo">데모 모드입니다. 배포 설정에 NOTION_TOKEN을 넣으면 점검할 수 있습니다.</p>
      ) : (
        <>
          <p className={`notice ${ok ? 'ok' : 'err'}`} role="status">
            {ok ? '모두 정상입니다. 노션에서 입력한 내용이 대시보드에 그대로 나옵니다.' : '확인이 필요한 항목이 있습니다. 아래 안내대로 노션을 고친 뒤 다시 점검해 주세요.'}
          </p>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>데이터베이스</th><th>상태</th><th>내용</th></tr></thead>
              <tbody>
                {result.map((r) => (
                  <tr key={r.key}>
                    <td><a href={NOTION_URLS[r.key as keyof typeof NOTION_URLS]} target="_blank" rel="noreferrer">{r.label}</a></td>
                    <td><span className={`badge ${r.ok ? 'ok' : 'warn'}`}>{r.ok ? '정상' : '확인 필요'}</span></td>
                    <td className="wrap">
                      {r.error ?? (r.issues.length === 0 ? '—' : (
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                          {r.issues.map((i) => <li key={i.name}><b>{i.name}</b>: {i.detail}</li>)}
                        </ul>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small muted">속성 이름이 바뀌었다면 노션에서 원래 이름으로 되돌리는 것이 가장 간단합니다. 이름을 바꾸고 싶으면 알려주세요. 앱 설정(src/lib/schema.ts)도 같이 고칩니다.</p>
        </>
      )}
    </div>
    </main>
  );
}
