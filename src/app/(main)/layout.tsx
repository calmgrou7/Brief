import { getData, isDemo } from '@/lib/repo';
import { NOTION_URLS } from '@/lib/schema';
import { tasks, todayKST } from '@/lib/derive';
import { AppChrome, type CompanyLite } from '../ui/Nav';
import { LoadError } from '../ui/LoadError';

export const dynamic = 'force-dynamic';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  let loadedAt = new Date().toISOString();
  let companies: CompanyLite[] = [];
  let urgent = 0;
  let error: unknown = null;
  try {
    const data = await getData();
    loadedAt = data.loadedAt;
    companies = data.companies
      .map((c) => ({ id: c.id, name: c.name, ceo: c.ceo, status: c.status, digits: [c.bizNo, c.mobile, c.phone].map((v) => v.replace(/\D/g, '')).join(' ') }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    urgent = tasks(data, todayKST()).filter((t) => t.kind === 'over' || t.kind === 'today').length;
  } catch (e) {
    error = e;
  }
  return (
    <AppChrome companies={companies} urgent={urgent} loadedAt={loadedAt}>
      {isDemo() && (
        <p className="notice demo">
          데모 모드 · 예시 데이터로 동작 중이며 서버를 다시 시작하면 변경 내용이 사라집니다. NOTION_TOKEN을 설정하면 <a href={NOTION_URLS.home} target="_blank" rel="noreferrer">노션 데이터베이스</a>와 연결됩니다.
        </p>
      )}
      {error ? <LoadError error={error} /> : children}
    </AppChrome>
  );
}
