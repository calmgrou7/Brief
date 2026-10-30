import { getData, isDemo } from '@/lib/repo';
import { NOTION_URLS } from '@/lib/schema';
import { SideNav, TabBar, TopBar } from '../ui/Nav';
import { LoadError } from '../ui/LoadError';

export const dynamic = 'force-dynamic';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  let loadedAt = new Date().toISOString();
  let error: unknown = null;
  try {
    loadedAt = (await getData()).loadedAt;
  } catch (e) {
    error = e;
  }
  return (
    <div className="shell">
      <SideNav loadedAt={loadedAt} />
      <div style={{ minWidth: 0 }}>
        <TopBar />
        <main className="main">
          {isDemo() && (
            <p className="notice demo">
              데모 모드 — 예시 데이터로 동작 중입니다. 변경 내용은 서버가 다시 시작되면 사라집니다.
              NOTION_TOKEN을 설정하면 <a href={NOTION_URLS.home} target="_blank" rel="noreferrer">노션 데이터베이스</a>와 연결됩니다.
            </p>
          )}
          {error ? <LoadError error={error} /> : children}
        </main>
      </div>
      <TabBar />
    </div>
  );
}
