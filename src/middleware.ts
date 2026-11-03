import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE, verify } from './lib/session';

export async function middleware(req: NextRequest) {
  if (await verify(req.cookies.get(COOKIE)?.value)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = req.nextUrl.pathname === '/' ? '' : `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // 로그인 화면과 정적 파일(아이콘·매니페스트)은 로그인 없이 열린다
  matcher: ['/((?!login|_next/static|_next/image|icon|apple-icon|manifest.webmanifest|favicon.ico).*)'],
};
