import type { Metadata } from 'next';
import Link from 'next/link';
import { getData } from '@/lib/repo';
import { companyRows, todayKST } from '@/lib/derive';
import { CompanyList } from './CompanyList';

export const metadata: Metadata = { title: '업체' };

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const data = await getData();
  const today = todayKST();
  return (
    <>
      <div className="page-head">
        <div><h1>업체</h1><p>노션 ‘기업컨설팅관리대시보드’ 기준 {data.companies.length}곳</p></div>
        <Link href="/admin/new" className="btn primary">+ 업체 추가</Link>
      </div>
      <CompanyList
        rows={companyRows(data, today)}
        today={today}
        initial={{ q: sp.q ?? '', status: sp.status ?? '', priority: '', task: '', staleOnly: sp.stale === '1' }}
      />
    </>
  );
}
