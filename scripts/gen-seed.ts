/** src/data/problems.ts → supabase/migrations/0002_seed_problems.sql */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PROBLEMS } from '../src/data/problems';

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const j = (v: unknown) => `$j$${JSON.stringify(v)}$j$::jsonb`;

const rows = PROBLEMS.map((p) =>
  `(${q(p.id)}, ${q(p.tier)}, ${q(p.topic)}, ${q(p.source)}, ${p.rating}, ${j(p.statement)}, ${p.hint ? j(p.hint) : 'null'}, ${j(p.explanation)}, ${j(p.answer)})`,
);

const sql = `-- 자동 생성 파일: npm run seed:gen  (원본 src/data/problems.ts)
insert into public.problems (id, tier, topic, source, rating, statement, hint, explanation, answer) values
${rows.join(',\n')}
on conflict (id) do update set
  tier = excluded.tier, topic = excluded.topic, source = excluded.source, rating = excluded.rating,
  statement = excluded.statement, hint = excluded.hint, explanation = excluded.explanation, answer = excluded.answer;
`;
writeFileSync(fileURLToPath(new URL('../supabase/migrations/0002_seed_problems.sql', import.meta.url)), sql);
console.log(`wrote ${PROBLEMS.length} problems`);
