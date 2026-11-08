import type { Answer, Bilingual, Problem } from '../types';

/*
 * 기본 문제은행 — 모든 문항은 고전 교재·정리에 근거해 새로 작성한 문제입니다.
 * (교재 원문을 옮기지 않고, '어떤 이론에 근거하는지'만 출처로 표기)
 * 수식은 $...$(인라인), $$...$$(블록) KaTeX 문법.
 */

const b = (ko: string, en: string): Bilingual => ({ ko, en });
const num = (value: number, tolerance?: number): Answer => ({ kind: 'numeric', value, tolerance });
const ch = (correct: number, ...options: Bilingual[]): Answer => ({ kind: 'choice', options, correct });
const same = (s: string) => b(s, s);

export const PROBLEMS: Problem[] = [
  /* ═════════ 중등 MIDDLE ═════════ */
  {
    id: 'm-euclid-gcd', tier: 'middle', topic: 'number', rating: 820,
    source: 'Euclid, Elements Book VII (Euclidean algorithm)',
    statement: b('유클리드 호제법으로 $\\gcd(252,\\,198)$을 구하시오.', 'Use the Euclidean algorithm to find $\\gcd(252,\\,198)$.'),
    answer: num(18),
    hint: b('$252 = 1\\cdot198 + 54$ 부터 시작하세요.', 'Start with $252 = 1\\cdot198 + 54$.'),
    explanation: b(
      '$252=198+54,\\ 198=3\\cdot54+36,\\ 54=36+18,\\ 36=2\\cdot18$ 이므로 최대공약수는 $18$.',
      '$252=198+54,\\ 198=3\\cdot54+36,\\ 54=36+18,\\ 36=2\\cdot18$, so the gcd is $18$.'),
  },
  {
    id: 'm-divisors-360', tier: 'middle', topic: 'number', rating: 880,
    source: 'Fundamental Theorem of Arithmetic',
    statement: b('$360$의 양의 약수의 개수는?', 'How many positive divisors does $360$ have?'),
    answer: num(24),
    explanation: b('$360=2^3\\cdot3^2\\cdot5$ 이므로 $(3+1)(2+1)(1+1)=24$.', '$360=2^3\\cdot3^2\\cdot5$, so $(3+1)(2+1)(1+1)=24$.'),
  },
  {
    id: 'm-pythagoras', tier: 'middle', topic: 'geometry', rating: 800,
    source: 'Euclid, Elements I.47 (Pythagorean theorem)',
    statement: b('두 변의 길이가 $20$, $21$인 직각삼각형의 빗변의 길이는?', 'A right triangle has legs $20$ and $21$. Find the hypotenuse.'),
    answer: num(29),
    explanation: b('$20^2+21^2=400+441=841=29^2$.', '$20^2+21^2=400+441=841=29^2$.'),
  },
  {
    id: 'm-polygon-angles', tier: 'middle', topic: 'geometry', rating: 840,
    source: 'Euclid, Elements I.32 (angle sum)',
    statement: b('볼록 십이각형의 내각의 합은 몇 도인가?', 'What is the sum of the interior angles of a convex 12-gon, in degrees?'),
    answer: num(1800),
    explanation: b('$n$각형은 $n-2$개의 삼각형으로 나뉘므로 $(12-2)\\cdot180^\\circ=1800^\\circ$.', 'It splits into $n-2$ triangles: $(12-2)\\cdot180^\\circ=1800^\\circ$.'),
  },
  {
    id: 'm-sieve-50', tier: 'middle', topic: 'number', rating: 900,
    source: 'Sieve of Eratosthenes',
    statement: b('$50$보다 작은 소수는 모두 몇 개인가?', 'How many primes are less than $50$?'),
    answer: num(15),
    explanation: b('$2,3,5,7,11,13,17,19,23,29,31,37,41,43,47$ — 총 $15$개.', '$2,3,5,7,11,13,17,19,23,29,31,37,41,43,47$ — fifteen in total.'),
  },
  {
    id: 'm-last-digit', tier: 'middle', topic: 'number', rating: 950,
    source: 'Modular arithmetic (cyclic patterns)',
    statement: b('$7^{2026}$의 일의 자리 숫자는?', 'What is the last digit of $7^{2026}$?'),
    answer: num(9),
    explanation: b('일의 자리는 $7,9,3,1$로 주기 $4$. $2026\\equiv2\\pmod 4$ 이므로 $9$.', 'Last digits cycle $7,9,3,1$ (period 4). $2026\\equiv2\\pmod4$, giving $9$.'),
  },
  {
    id: 'm-sqrt2', tier: 'middle', topic: 'number', rating: 980,
    source: 'Euclid, Elements X (irrationality of √2)',
    statement: b(
      '$\\sqrt2=\\dfrac{p}{q}$ (기약분수)라 가정하는 귀류법 증명에서 모순을 만드는 핵심 사실은?',
      'In the proof by contradiction assuming $\\sqrt2=\\dfrac{p}{q}$ in lowest terms, which fact produces the contradiction?'),
    answer: ch(2,
      b('$p+q$는 짝수이다', '$p+q$ is even'),
      b('$p$와 $q$는 모두 홀수이다', '$p$ and $q$ are both odd'),
      b('$p$와 $q$가 모두 짝수가 되어 기약이라는 가정에 어긋난다', '$p$ and $q$ both turn out even, contradicting lowest terms'),
      b('$p^2=q$ 이다', '$p^2=q$')),
    explanation: b(
      '$p^2=2q^2$ 이므로 $p$는 짝수, $p=2k$를 대입하면 $q^2=2k^2$ 으로 $q$도 짝수 — 기약분수 가정과 모순.',
      '$p^2=2q^2$ forces $p$ even; writing $p=2k$ gives $q^2=2k^2$, so $q$ is even too — contradicting lowest terms.'),
  },

  /* ═════════ 고등 HIGH ═════════ */
  {
    id: 'h-sum-squares', tier: 'high', topic: 'algebra', rating: 1100,
    source: 'Faulhaber / mathematical induction',
    statement: b('$\\displaystyle\\sum_{k=1}^{100}k^2$ 의 값은?', 'Evaluate $\\displaystyle\\sum_{k=1}^{100}k^2$.'),
    answer: num(338350),
    explanation: b('$\\frac{n(n+1)(2n+1)}{6}=\\frac{100\\cdot101\\cdot201}{6}=338350$.', '$\\frac{n(n+1)(2n+1)}{6}=\\frac{100\\cdot101\\cdot201}{6}=338350$.'),
  },
  {
    id: 'h-binomial', tier: 'high', topic: 'combinatorics', rating: 1080,
    source: 'Binomial theorem (Pascal)',
    statement: b('$(2x+1)^5$ 전개식에서 $x^3$의 계수는?', 'Find the coefficient of $x^3$ in $(2x+1)^5$.'),
    answer: num(80),
    explanation: b('$\\binom53\\cdot2^3=10\\cdot8=80$.', '$\\binom53\\cdot2^3=10\\cdot8=80$.'),
  },
  {
    id: 'h-inclusion-exclusion', tier: 'high', topic: 'combinatorics', rating: 1250,
    source: 'Principle of inclusion–exclusion',
    statement: b('$1$부터 $1000$까지의 정수 중 $3$, $5$, $7$ 중 적어도 하나로 나누어떨어지는 수의 개수는?', 'How many integers in $1,\\dots,1000$ are divisible by at least one of $3$, $5$, $7$?'),
    answer: num(543),
    explanation: b('$333+200+142-66-47-28+9=543$.', '$333+200+142-66-47-28+9=543$.'),
  },
  {
    id: 'h-fermat', tier: 'high', topic: 'number', rating: 1200,
    source: "Fermat's little theorem",
    statement: b('$3^{100}$을 $7$로 나눈 나머지는?', 'Find the remainder when $3^{100}$ is divided by $7$.'),
    answer: num(4),
    explanation: b('페르마 소정리로 $3^6\\equiv1$. $100=6\\cdot16+4$ 이므로 $3^4=81\\equiv4$.', 'By Fermat, $3^6\\equiv1$. Since $100=6\\cdot16+4$, $3^4=81\\equiv4$.'),
  },
  {
    id: 'h-limit-sin', tier: 'high', topic: 'analysis', rating: 1050,
    source: 'Squeeze theorem, $\\lim \\sin x / x = 1$',
    statement: b('$\\displaystyle\\lim_{x\\to0}\\frac{\\sin 3x}{x}$ 의 값은?', 'Evaluate $\\displaystyle\\lim_{x\\to0}\\frac{\\sin 3x}{x}$.'),
    answer: num(3),
    explanation: b('$\\frac{\\sin3x}{x}=3\\cdot\\frac{\\sin3x}{3x}\\to3$.', '$\\frac{\\sin3x}{x}=3\\cdot\\frac{\\sin3x}{3x}\\to3$.'),
  },
  {
    id: 'h-integral-parts', tier: 'high', topic: 'analysis', rating: 1180,
    source: 'Integration by parts',
    statement: b('$\\displaystyle\\int_0^1 x e^x\\,dx$ 의 값은?', 'Evaluate $\\displaystyle\\int_0^1 x e^x\\,dx$.'),
    answer: num(1),
    explanation: b('$\\big[xe^x-e^x\\big]_0^1=(e-e)-(0-1)=1$.', '$\\big[xe^x-e^x\\big]_0^1=(e-e)-(0-1)=1$.'),
  },
  {
    id: 'h-de-moivre', tier: 'high', topic: 'complex', rating: 1150,
    source: "De Moivre's theorem",
    statement: b('$(1+i)^8$ 의 값은? (실수로 답하시오)', 'Compute $(1+i)^8$ (it is real).'),
    answer: num(16),
    explanation: b('$1+i=\\sqrt2\\,e^{i\\pi/4}$ 이므로 $(1+i)^8=16\\,e^{2\\pi i}=16$.', '$1+i=\\sqrt2\\,e^{i\\pi/4}$, so $(1+i)^8=16\\,e^{2\\pi i}=16$.'),
  },
  {
    id: 'h-catalan', tier: 'high', topic: 'combinatorics', rating: 1320,
    source: 'Catalan numbers',
    statement: b('곱 $a_1a_2a_3a_4a_5$에 괄호를 완전히 치는 방법의 수는?', 'In how many ways can the product $a_1a_2a_3a_4a_5$ be fully parenthesized?'),
    answer: num(14),
    explanation: b('$n$개 인수의 괄호 방법 수는 카탈랑 수 $C_{n-1}$. $C_4=\\frac{1}{5}\\binom84=14$.', 'The count is the Catalan number $C_{n-1}$; $C_4=\\frac{1}{5}\\binom84=14$.'),
  },

  /* ═════════ 학부 UNDERGRAD ═════════ */
  {
    id: 'u-radius-convergence', tier: 'undergrad', topic: 'analysis', rating: 1480,
    source: 'Ratio test / Stirling (real analysis texts)',
    statement: b('멱급수 $\\displaystyle\\sum_{n\\ge1}\\frac{n!}{n^n}x^n$ 의 수렴반경은?', 'Find the radius of convergence of $\\displaystyle\\sum_{n\\ge1}\\frac{n!}{n^n}x^n$.'),
    answer: ch(1, same('$1$'), same('$e$'), same('$1/e$'), same('$\\infty$')),
    explanation: b('$\\frac{a_{n+1}}{a_n}=\\left(\\frac{n}{n+1}\\right)^n\\to\\frac1e$ 이므로 $R=e$.', '$\\frac{a_{n+1}}{a_n}=\\left(\\frac{n}{n+1}\\right)^n\\to\\frac1e$, hence $R=e$.'),
  },
  {
    id: 'u-determinant', tier: 'undergrad', topic: 'linear', rating: 1380,
    source: 'Cofactor expansion (linear algebra)',
    statement: b('$\\det\\begin{pmatrix}2&1&0\\\\1&2&1\\\\0&1&2\\end{pmatrix}$ 의 값은?', 'Compute $\\det\\begin{pmatrix}2&1&0\\\\1&2&1\\\\0&1&2\\end{pmatrix}$.'),
    answer: num(4),
    explanation: b('첫 행 전개: $2(4-1)-1(2-0)=4$.', 'Expand along row 1: $2(4-1)-1(2-0)=4$.'),
  },
  {
    id: 'u-s4-involutions', tier: 'undergrad', topic: 'abstract', rating: 1520,
    source: 'Cycle decomposition in symmetric groups',
    statement: b('대칭군 $S_4$에서 위수가 $2$인 원소의 개수는?', 'How many elements of order $2$ are in $S_4$?'),
    answer: num(9),
    explanation: b('호환 $\\binom42=6$개 + 서로소 호환의 곱 $3$개 $=9$.', '$\\binom42=6$ transpositions plus $3$ double transpositions $=9$.'),
  },
  {
    id: 'u-basel', tier: 'undergrad', topic: 'analysis', rating: 1420,
    source: 'Euler, Basel problem (1734)',
    statement: b('$\\displaystyle\\sum_{n=1}^{\\infty}\\frac1{n^2}$ 의 값은?', 'Evaluate $\\displaystyle\\sum_{n=1}^{\\infty}\\frac1{n^2}$.'),
    answer: ch(3, same('$\\pi/4$'), same('$e^2/6$'), same('$\\ln 2$'), same('$\\pi^2/6$')),
    explanation: b('오일러가 $\\frac{\\sin x}{x}$의 무한곱 전개를 이용해 $\\zeta(2)=\\frac{\\pi^2}{6}$ 을 보였다.', 'Euler used the product expansion of $\\frac{\\sin x}{x}$ to show $\\zeta(2)=\\frac{\\pi^2}{6}$.'),
  },
  {
    id: 'u-eigen', tier: 'undergrad', topic: 'linear', rating: 1400,
    source: 'Characteristic polynomial',
    statement: b('행렬 $\\begin{pmatrix}4&1\\\\2&3\\end{pmatrix}$ 의 가장 큰 고윳값은?', 'Find the largest eigenvalue of $\\begin{pmatrix}4&1\\\\2&3\\end{pmatrix}$.'),
    answer: num(5),
    explanation: b('$\\lambda^2-7\\lambda+10=0$ 이므로 $\\lambda=5,2$.', '$\\lambda^2-7\\lambda+10=0$ gives $\\lambda=5,2$.'),
  },
  {
    id: 'u-groups-order-8', tier: 'undergrad', topic: 'abstract', rating: 1620,
    source: 'Classification of groups of order $p^3$',
    statement: b('동형을 제외하고 위수 $8$인 군은 몇 개인가?', 'Up to isomorphism, how many groups of order $8$ are there?'),
    answer: num(5),
    explanation: b('아벨군 $\\mathbb Z_8,\\ \\mathbb Z_4\\times\\mathbb Z_2,\\ \\mathbb Z_2^3$ 과 비아벨군 $D_4,\\ Q_8$ — 총 $5$개.', 'Abelian $\\mathbb Z_8,\\ \\mathbb Z_4\\times\\mathbb Z_2,\\ \\mathbb Z_2^3$ and non-abelian $D_4,\\ Q_8$ — five.'),
  },
  {
    id: 'u-totient', tier: 'undergrad', topic: 'number', rating: 1360,
    source: "Euler's totient function",
    statement: b('$\\varphi(1000)$ 의 값은?', 'Compute $\\varphi(1000)$.'),
    answer: num(400),
    explanation: b('$1000\\left(1-\\frac12\\right)\\left(1-\\frac15\\right)=400$.', '$1000\\left(1-\\frac12\\right)\\left(1-\\frac15\\right)=400$.'),
  },
  {
    id: 'u-gaussian', tier: 'undergrad', topic: 'analysis', rating: 1450,
    source: 'Gaussian integral (polar coordinates)',
    statement: b('$\\displaystyle\\int_{-\\infty}^{\\infty}e^{-x^2}\\,dx$ 의 값은?', 'Evaluate $\\displaystyle\\int_{-\\infty}^{\\infty}e^{-x^2}\\,dx$.'),
    answer: ch(0, same('$\\sqrt\\pi$'), same('$\\pi$'), same('$\\sqrt{2\\pi}$'), same('$1$')),
    explanation: b('$I^2=\\iint e^{-(x^2+y^2)}=\\int_0^{2\\pi}\\!\\int_0^\\infty e^{-r^2}r\\,dr\\,d\\theta=\\pi$.', '$I^2=\\iint e^{-(x^2+y^2)}=\\int_0^{2\\pi}\\!\\int_0^\\infty e^{-r^2}r\\,dr\\,d\\theta=\\pi$.'),
  },
  {
    id: 'u-residue', tier: 'undergrad', topic: 'complex', rating: 1580,
    source: 'Cauchy residue theorem',
    statement: b('$\\displaystyle\\oint_{|z|=2}\\frac{dz}{z^2+1}$ 의 값은?', 'Evaluate $\\displaystyle\\oint_{|z|=2}\\frac{dz}{z^2+1}$.'),
    answer: num(0),
    explanation: b('극 $\\pm i$의 유수는 $\\frac1{2i},\\ -\\frac1{2i}$ — 합이 $0$이므로 적분값은 $0$.', 'Residues at $\\pm i$ are $\\frac1{2i}$ and $-\\frac1{2i}$, summing to $0$.'),
  },

  /* ═════════ 대학원 GRAD ═════════ */
  {
    id: 'g-sylow-a5', tier: 'grad', topic: 'abstract', rating: 1720,
    source: 'Sylow theorems',
    statement: b('교대군 $A_5$의 실로우 $5$-부분군의 개수는?', 'How many Sylow $5$-subgroups does $A_5$ have?'),
    answer: num(6),
    explanation: b('$n_5\\equiv1\\pmod5$, $n_5\\mid12$ 이고 $A_5$는 단순군이므로 $n_5\\ne1$, 따라서 $6$.', '$n_5\\equiv1\\pmod5$ and $n_5\\mid12$; $A_5$ is simple so $n_5\\ne1$, hence $6$.'),
  },
  {
    id: 'g-galois-cubic', tier: 'grad', topic: 'abstract', rating: 1760,
    source: 'Galois theory (splitting fields)',
    statement: b('$x^3-2$의 $\\mathbb Q$ 위 갈루아 군의 위수는?', 'What is the order of the Galois group of $x^3-2$ over $\\mathbb Q$?'),
    answer: num(6),
    explanation: b('분해체 $\\mathbb Q(\\sqrt[3]2,\\omega)$의 차수는 $3\\cdot2=6$, 갈루아 군은 $S_3$.', 'The splitting field $\\mathbb Q(\\sqrt[3]2,\\omega)$ has degree $3\\cdot2=6$; the group is $S_3$.'),
  },
  {
    id: 'g-torus-pi1', tier: 'grad', topic: 'topology', rating: 1700,
    source: 'Fundamental group (Hatcher-style algebraic topology)',
    statement: b('토러스 $T^2$의 기본군은?', 'What is the fundamental group of the torus $T^2$?'),
    answer: ch(2, same('$\\mathbb Z$'), same('$\\mathbb Z * \\mathbb Z$'), same('$\\mathbb Z\\times\\mathbb Z$'), same('$\\mathbb Z_2$')),
    explanation: b('$\\pi_1(S^1\\times S^1)=\\pi_1(S^1)\\times\\pi_1(S^1)=\\mathbb Z^2$.', '$\\pi_1(S^1\\times S^1)=\\pi_1(S^1)\\times\\pi_1(S^1)=\\mathbb Z^2$.'),
  },
  {
    id: 'g-euler-char', tier: 'grad', topic: 'topology', rating: 1680,
    source: 'Classification of surfaces',
    statement: b('종수 $3$인 닫힌 가향 곡면의 오일러 지표는?', 'Find the Euler characteristic of the closed orientable surface of genus $3$.'),
    answer: num(-4),
    explanation: b('$\\chi=2-2g=2-6=-4$.', '$\\chi=2-2g=2-6=-4$.'),
  },
  {
    id: 'g-field-degree', tier: 'grad', topic: 'abstract', rating: 1650,
    source: 'Tower law for field extensions',
    statement: b('$[\\mathbb Q(\\sqrt2,\\sqrt3):\\mathbb Q]$ 의 값은?', 'Compute $[\\mathbb Q(\\sqrt2,\\sqrt3):\\mathbb Q]$.'),
    answer: num(4),
    explanation: b('$\\sqrt3\\notin\\mathbb Q(\\sqrt2)$ 이므로 탑 법칙에 의해 $2\\cdot2=4$.', 'Since $\\sqrt3\\notin\\mathbb Q(\\sqrt2)$, the tower law gives $2\\cdot2=4$.'),
  },
  {
    id: 'g-class-number', tier: 'grad', topic: 'number', rating: 1880,
    source: 'Algebraic number theory (ideal class group)',
    statement: b('$\\mathbb Q(\\sqrt{-5})$의 류수(class number)는?', 'What is the class number of $\\mathbb Q(\\sqrt{-5})$?'),
    answer: num(2),
    explanation: b('$6=2\\cdot3=(1+\\sqrt{-5})(1-\\sqrt{-5})$ 로 유일 인수분해가 깨지고, 민코프스키 상한으로 $h=2$.', '$6=2\\cdot3=(1+\\sqrt{-5})(1-\\sqrt{-5})$ breaks unique factorization; the Minkowski bound yields $h=2$.'),
  },
  {
    id: 'g-cantor-measure', tier: 'grad', topic: 'analysis', rating: 1660,
    source: 'Lebesgue measure theory',
    statement: b('칸토어 삼진 집합의 르베그 측도는?', 'What is the Lebesgue measure of the Cantor ternary set?'),
    answer: num(0),
    explanation: b('제거된 구간 길이 합 $\\sum_{n\\ge0}\\frac{2^n}{3^{n+1}}=1$ 이므로 남은 측도는 $0$.', 'Removed lengths sum to $\\sum_{n\\ge0}\\frac{2^n}{3^{n+1}}=1$, so the remainder has measure $0$.'),
  },
  {
    id: 'g-irreps-s4', tier: 'grad', topic: 'abstract', rating: 1800,
    source: 'Representation theory of finite groups',
    statement: b('$S_4$의 기약 복소 표현은 (동형 제외) 몇 개인가?', 'How many irreducible complex representations (up to isomorphism) does $S_4$ have?'),
    answer: num(5),
    explanation: b('켤레류의 수와 같다: 분할 $4,\\,31,\\,22,\\,211,\\,1111$ — $5$개. ($24=1+1+4+9+9$)', 'It equals the number of conjugacy classes: partitions $4,31,22,211,1111$ — five. ($24=1+1+4+9+9$)'),
  },

  /* ═════════ 연구 RESEARCH ═════════ */
  {
    id: 'r-ramsey-33', tier: 'research', topic: 'combinatorics', rating: 1950,
    source: 'Ramsey theory',
    statement: b('램지 수 $R(3,3)$ 의 값은?', 'What is the Ramsey number $R(3,3)$?'),
    answer: num(6),
    explanation: b('$K_5$에는 단색 삼각형이 없는 2-색칠(오각형+별)이 있고, $K_6$에서는 비둘기집 원리로 항상 존재.', '$K_5$ has a 2-colouring without monochromatic triangles (pentagon + pentagram); in $K_6$ the pigeonhole principle forces one.'),
  },
  {
    id: 'r-cubic-lines', tier: 'research', topic: 'geometry', rating: 2050,
    source: 'Cayley–Salmon theorem (1849)',
    statement: b('복소사영공간의 매끄러운 삼차 곡면 위에 놓인 직선의 개수는?', 'How many lines lie on a smooth cubic surface in complex projective 3-space?'),
    answer: num(27),
    explanation: b('케일리–새먼 정리: 정확히 $27$개. 그 대칭군은 $W(E_6)$와 관련된다.', 'Cayley–Salmon: exactly $27$; their incidence symmetry is governed by $W(E_6)$.'),
  },
  {
    id: 'r-exotic-s7', tier: 'research', topic: 'topology', rating: 2200,
    source: 'Milnor (1956); Kervaire–Milnor (1963)',
    statement: b('향을 고려할 때 $S^7$ 위의 서로 다른 매끄러운 구조(이국적 구면 포함)는 몇 개인가?', 'Counting orientation, how many distinct smooth structures (exotic spheres included) exist on $S^7$?'),
    answer: num(28),
    explanation: b('커베어–밀너는 호모토피 7-구면의 군 $\\Theta_7\\cong\\mathbb Z_{28}$ 을 계산했다.', 'Kervaire–Milnor computed the group of homotopy 7-spheres: $\\Theta_7\\cong\\mathbb Z_{28}$.'),
  },
  {
    id: 'r-e8-dim', tier: 'research', topic: 'abstract', rating: 2100,
    source: 'Killing–Cartan classification of simple Lie algebras',
    statement: b('예외 단순 리 대수 $\\mathfrak e_8$의 차원은?', 'What is the dimension of the exceptional simple Lie algebra $\\mathfrak e_8$?'),
    answer: num(248),
    explanation: b('근 $240$개 + 계수(rank) $8$ $=248$.', '$240$ roots plus rank $8$ gives $248$.'),
  },
  {
    id: 'r-ramanujan-tau', tier: 'research', topic: 'number', rating: 2150,
    source: 'Ramanujan (1916), modular forms',
    statement: b(
      '$\\Delta(q)=q\\prod_{n\\ge1}(1-q^n)^{24}=\\sum\\tau(n)q^n$ 에서 $\\tau(2)$ 의 값은?',
      'With $\\Delta(q)=q\\prod_{n\\ge1}(1-q^n)^{24}=\\sum\\tau(n)q^n$, find $\\tau(2)$.'),
    answer: num(-24),
    explanation: b('$q(1-q)^{24}\\cdots=q-24q^2+\\cdots$ 이므로 $\\tau(2)=-24$.', '$q(1-q)^{24}\\cdots=q-24q^2+\\cdots$, so $\\tau(2)=-24$.'),
  },
  {
    id: 'r-wallpaper', tier: 'research', topic: 'geometry', rating: 1980,
    source: 'Fedorov (1891), crystallographic groups',
    statement: b('평면 결정군(벽지 무늬 군)은 모두 몇 종류인가?', 'How many wallpaper (plane crystallographic) groups are there?'),
    answer: num(17),
    explanation: b('페도로프와 펄리아가 분류한 $17$개의 벽지군.', 'Fedorov and Pólya classified exactly $17$ wallpaper groups.'),
  },
  {
    id: 'r-kissing-8', tier: 'research', topic: 'geometry', rating: 2120,
    source: 'Odlyzko–Sloane / Levenshtein (1979), $E_8$ lattice',
    statement: b('$8$차원에서의 키싱 수(한 단위구에 동시에 접할 수 있는 단위구의 최대 개수)는?', 'What is the kissing number in dimension $8$?'),
    answer: num(240),
    explanation: b('$E_8$ 격자의 최소 벡터 $240$개가 최적이며 1979년에 증명되었다.', 'The $240$ minimal vectors of the $E_8$ lattice are optimal (proved 1979).'),
  },
  {
    id: 'r-zeta-minus1', tier: 'research', topic: 'complex', rating: 2000,
    source: 'Riemann (1859), analytic continuation of $\\zeta$',
    statement: b('해석적 연속으로 정의한 $\\zeta(-1)$ 의 값은? (분수 입력 가능, 예: 1/3)', 'Find $\\zeta(-1)$ via analytic continuation. (Fractions allowed, e.g. 1/3)'),
    answer: num(-1 / 12, 1e-6),
    explanation: b('$\\zeta(-n)=-\\frac{B_{n+1}}{n+1}$, $B_2=\\frac16$ 이므로 $\\zeta(-1)=-\\frac1{12}$.', '$\\zeta(-n)=-\\frac{B_{n+1}}{n+1}$ with $B_2=\\frac16$, giving $\\zeta(-1)=-\\frac1{12}$.'),
  },
];
