import { koreanAmount } from './format';

it('큰 금액을 억·만 단위로 읽는다', () => {
  expect(koreanAmount(500_000_000)).toBe('5억원');
  expect(koreanAmount(1_234_500_000)).toBe('12억 3,450만원');
  expect(koreanAmount(-30_000_000)).toBe('−3,000만원');
  expect(koreanAmount(5_000)).toBe('5,000원');
});
