import type { Metadata } from 'next';
import { blankCompany } from '@/lib/repo';
import { CompanyForm } from '../CompanyForm';

export const metadata: Metadata = { title: '업체 추가' };

export default function NewCompany() {
  return (
    <>
      <div className="page-head"><div><h1>업체 추가</h1><p>저장하면 노션 ‘기업컨설팅관리대시보드’에 새 행으로 등록됩니다.</p></div></div>
      <CompanyForm c={blankCompany()} />
    </>
  );
}
