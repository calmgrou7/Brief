import Link from "next/link";
import { logout } from "@/app/auth-actions";
import { authMode, isOwner } from "@/lib/auth";
import { getMode, listClients } from "@/lib/data";

// 운영자 화면 공통 헤더 (전체 고객 메뉴). 고객 공유 리포트(/r)에는 붙지 않는다.
export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  // 로그인 전에는 고객 이름이 담긴 헤더를 그리지 않는다.
  // 로그인 화면으로 보내는 일은 각 페이지가 자기 주소를 담아서 한다 (돌아갈 곳을 알아야 하므로).
  if (!(await isOwner())) return <>{children}</>;
  const [mode, clients] = await Promise.all([getMode(), listClients()]);
  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <nav className="flex min-w-0 items-center gap-1 overflow-x-auto text-sm">
            <Link href="/" className="mr-2 flex shrink-0 items-center gap-1.5 text-base font-bold tracking-tight text-ink">
              <span aria-hidden className="inline-flex size-6 items-center justify-center rounded-md bg-accent text-xs text-white">B</span>
              Brief
            </Link>
            <Link href="/" className="shrink-0 rounded-md px-2 py-1 font-medium text-ink hover:bg-surface-2">
              결정함
            </Link>
            {clients.map((c) => (
              <Link key={c.id} href={`/clients/${c.id}`} className="shrink-0 rounded-md px-2 py-1 text-ink-2 hover:bg-surface-2 hover:text-ink">
                {c.name}
              </Link>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            {mode === "sample" ? (
              <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs text-ink-2" title="META_ACCESS_TOKEN과 clients.config.json을 설정하면 실제 데이터로 바뀝니다">
                샘플 데이터
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs text-ink-2">메타 연결됨</span>
            )}
            {authMode() === "password" && (
              <form action={logout}>
                <button type="submit" className="rounded-md px-2 py-1 text-xs text-ink-2 hover:bg-surface-2 hover:text-ink">
                  로그아웃
                </button>
              </form>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </>
  );
}
