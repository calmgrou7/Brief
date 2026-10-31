import type { Metadata } from 'next';
import Link from 'next/link';
import { getData, isDemo } from '@/lib/repo';
import { NOTION_URLS } from '@/lib/schema';
import { Icon, type IconName } from '../../ui/icons';
import { logout } from '../../actions';

export const metadata: Metadata = { title: '더보기' };

function Item({ href, icon, tone, title, sub, external }: { href: string; icon: IconName; tone: string; title: string; sub: string; external?: boolean }) {
  const inner = <><span className={`mi qi ${tone}`}><Icon name={icon} /></span><span><b>{title}</b><small>{sub}</small></span><svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="m9 6 6 6-6 6" /></svg></>;
  return <li>{external ? <a href={href} target="_blank" rel="noreferrer">{inner}</a> : <Link href={href}>{inner}</Link>}</li>;
}

export default async function More() {
  const data = await getData();
  const links = [...data.links].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  return (
    <div className="stack">
      <div className="page-head" style={{ marginBottom: 0 }}><div><h1>더보기</h1><p>관리·연결·설정</p></div></div>

      <section className="card">
        <div className="card-head"><h2>업무</h2></div>
        <ul className="menu-list">
          <Item href="/tasks" icon="tasks" tone="c1" title="할 일" sub="지난 일·오늘·연락 필요·보험 만기" />
          <Item href="/admin" icon="building" tone="c2" title="업체 관리" sub="업체 추가·수정·삭제 (노션에 바로 반영)" />
          <Item href="/admin/new" icon="plus" tone="c1" title="신규 업체 등록" sub="노션 업체 DB에 새 행 추가" />
          <li><span className="disabled"><span className="mi qi c3"><Icon name="file" /></span><span><b>자문 리포트</b><small>종합솔루션·차년도 실행 리포트 (P2 준비 중 · 아직 사용할 수 없음)</small></span></span></li>
        </ul>
      </section>

      <section className="card">
        <div className="card-head"><h2>연계 대시보드</h2><Link href="/admin">링크 관리<Icon name="chevron" /></Link></div>
        {links.length === 0 ? <p className="small muted">등록된 링크가 없습니다. 관리자 화면에서 추가할 수 있습니다.</p> : (
          <ul className="menu-list">
            {links.map((l) => <Item key={l.id} href={l.href} icon="external" tone="c2" title={l.name} sub={l.desc || l.href} external />)}
          </ul>
        )}
        <p className="small muted" style={{ marginTop: 8 }}>다른 대시보드와 데이터는 공유하지 않고 링크로만 연결합니다.</p>
      </section>

      <section className="card">
        <div className="card-head"><h2>설정 · 연결</h2></div>
        <ul className="menu-list">
          <Item href="/check" icon="shield" tone="c4" title="노션 연결 점검" sub={isDemo() ? '데모 모드 · NOTION_TOKEN 설정 후 점검 가능' : '데이터베이스 8개 접근·속성 확인'} />
          <Item href={NOTION_URLS.home} icon="notion" tone="c3" title="노션 프로젝트 홈" sub="원본 데이터베이스 열기" external />
          <li>
            <form action={logout}>
              <button><span className="mi qi c4"><Icon name="logout" /></span><span><b>로그아웃</b><small>이 기기에서 로그아웃</small></span></button>
            </form>
          </li>
        </ul>
      </section>
    </div>
  );
}
