import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getData } from '@/lib/repo';
import { CompanyForm } from '../CompanyForm';
import { DeleteCompany } from '../DeleteCompany';

export const metadata: Metadata = { title: '업체 수정' };

export default async function EditCompany({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = (await getData()).companies.find((x) => x.id === id);
  if (!c) notFound();
  return (
    <>
      <div className="page-head">
        <div><h1>업체 수정</h1><p>{c.name} · 저장하면 노션에 바로 반영됩니다.</p></div>
        <DeleteCompany id={c.id} name={c.name} />
      </div>
      <CompanyForm c={c} />
    </>
  );
}
