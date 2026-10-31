import type { Metadata } from 'next';
import Link from 'next/link';
import { getData } from '@/lib/repo';
import { companyRows, todayKST } from '@/lib/derive';
import { CompanyList } from './CompanyList';
import { Icon } from '../../ui/icons';

export const metadata: Metadata = { title: '업체' };

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const data = await getData();
  const today = todayKST();
  return (
    <>
      <div className="page-head">
        <div><h1>업체</h1><p>관리 업체 {data.companies.length}곳 · 연락이 오래된 업체가 위에 옵니다</p></div>
        <Link href="/admin/new" className="btn primary"><Icon name="plus" />업체 추가</Link>
      </div>
      <CompanyList
        rows={companyRows(data, today)}
        today={today}
        initial={{ q: sp.q ?? '', status: sp.status ?? '', priority: '', task: '', staleOnly: sp.stale === '1' }}
      />
    </>
  );
}
