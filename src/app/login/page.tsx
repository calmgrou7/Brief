import type { Metadata } from 'next';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: '로그인' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = '/' } = await searchParams;
  const devHint = process.env.NODE_ENV !== 'production' && !process.env.ADMIN_PASSWORD;
  return (
    <main className="login">
      <div className="login-card">
        <div className="brand">
          <span className="brand-mark" />
          <span><b>채움 기업컨설팅</b><small>관리 대시보드</small></span>
        </div>
        <p className="muted small">관리자 비밀번호를 입력해 주세요.</p>
        <LoginForm next={next} />
        {devHint && <p className="hint">개발 모드 기본 비밀번호: chaeum (배포 시 ADMIN_PASSWORD로 바꿔 주세요)</p>}
      </div>
    </main>
  );
}
