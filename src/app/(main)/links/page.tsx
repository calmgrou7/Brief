import type { Metadata } from 'next';
import Link from 'next/link';
import { getData } from '@/lib/repo';
import { Icon } from '../../ui/icons';

export const metadata: Metadata = { title: '연계 대시보드' };

export default async function Links() {
  const links = [...(await getData()).links].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  return (
    <>
      <div className="page-head">
        <div><h1>연계 대시보드</h1><p>다른 기업컨설팅대시보드·위들리 대시보드로 바로 이동합니다. 데이터는 공유하지 않습니다.</p></div>
        <Link href="/admin" className="btn">링크 관리</Link>
      </div>
      {links.length === 0 ? (
        <div className="card empty">등록된 링크가 없습니다. <Link href="/admin">관리자</Link>에서 주소를 추가해 주세요.</div>
      ) : (
        <div className="link-cards">
          {links.map((l) => (
            <a key={l.id} href={l.href} className="card link-card" {...(l.newTab ? { target: '_blank', rel: 'noreferrer' } : {})}>
              <b>{l.name}<Icon name="external" /></b>
              {l.desc && <span className="small muted">{l.desc}</span>}
              <span className="url">{l.href}</span>
            </a>
          ))}
        </div>
      )}
    </>
  );
}
