import type { Metadata } from 'next';
import Link from 'next/link';
import { getData, isDemo } from '@/lib/repo';
import { companyRows, fmtDate, relDay, todayKST } from '@/lib/derive';
import { NOTION_URLS } from '@/lib/schema';
import { StatusBadge } from '../../ui/bits';
import { DeleteCompany } from './DeleteCompany';
import { LinkManager } from './LinkManager';

export const metadata: Metadata = { title: '관리자' };

export default async function Admin({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { deleted } = await searchParams;
  const data = await getData();
  const today = todayKST();
  const rows = companyRows(data, today).sort((a, b) => (Number(b.no) || 0) - (Number(a.no) || 0));
  const links = [...data.links].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  return (
    <div className="stack">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div><h1>관리자</h1><p>여기서 바꾼 내용은 노션에 바로 반영됩니다.</p></div>
        <Link href="/admin/new" className="btn primary">+ 업체 추가</Link>
      </div>
      {deleted && <p className="notice ok" role="status">삭제했습니다. 노션 휴지통에서 30일 안에 복구할 수 있습니다.</p>}

      <section className="card">
        <div className="card-head"><h2>업체 관리 <span className="count">{rows.length}</span></h2><a href={NOTION_URLS.companies} target="_blank" rel="noreferrer">노션에서 열기</a></div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>No.</th><th>기업명</th><th>상태</th><th>사업자등록번호</th><th>대표자</th><th>출처</th><th>최근 접촉</th><th>최종수정</th><th></th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>{c.no || '—'}</td>
                  <td><Link href={`/companies/${c.id}`}>{c.name}</Link></td>
                  <td><StatusBadge status={c.status} /></td>
                  <td>{c.bizNo || <span className="muted">미입력</span>}</td>
                  <td>{c.ceo || '—'}</td>
                  <td>{c.source || '—'}</td>
                  <td>{c.touch ? relDay(c.touch.date, today) : '—'}</td>
                  <td className="muted small">{fmtDate(c.updatedAt.slice(0, 10))}</td>
                  <td><div className="row" style={{ flexWrap: 'nowrap' }}><Link href={`/admin/${c.id}`} className="btn sm">수정</Link><DeleteCompany id={c.id} name={c.name} small /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="card-head"><h2>연계 대시보드 링크</h2><a href={NOTION_URLS.links} target="_blank" rel="noreferrer">노션에서 열기</a></div>
        <p className="small muted" style={{ marginBottom: 12 }}>‘연계 대시보드’ 메뉴에 표시할 다른 기업컨설팅대시보드·위들리 대시보드 주소입니다. 데이터는 공유하지 않고 링크만 연결합니다.</p>
        <LinkManager links={links} />
      </section>

      <section className="card">
        <div className="card-head"><h2>연결 상태</h2></div>
        <dl className="facts">
          <div><dt>데이터 원본</dt><dd>{isDemo() ? '데모(예시 데이터)' : '노션 연결됨'}</dd></div>
          <div><dt>불러온 시각</dt><dd>{new Date(data.loadedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</dd></div>
          <div><dt>캐시</dt><dd>1분 · 저장하면 즉시 갱신</dd></div>
          <div><dt>노션 프로젝트 홈</dt><dd><a href={NOTION_URLS.home} target="_blank" rel="noreferrer">열기</a></dd></div>
        </dl>
      </section>
    </div>
  );
}
