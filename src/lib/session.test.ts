import { describe, expect, it } from 'vitest';
import { passwordMatches, sign, verify } from './session';

describe('로그인 쿠키', () => {
  it('서명한 토큰은 통과, 변조·만료는 거부', async () => {
    const t = (await sign())!;
    expect(await verify(t)).toBe(true);
    expect(await verify(t.replace(/.$/, (c) => (c === '0' ? '1' : '0')))).toBe(false);
    expect(await verify(`9999999999.${t.split('.')[1]}`)).toBe(false); // 만료시각만 바꾸면 서명 불일치
    expect(await verify(t, Date.now() + 31 * 86_400_000)).toBe(false);
    expect(await verify(undefined)).toBe(false);
  });
  it('개발 환경 기본 비밀번호', async () => {
    expect(await passwordMatches('chaeum')).toBe(true);
    expect(await passwordMatches('wrong')).toBe(false);
  });
});
