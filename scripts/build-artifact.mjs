// dist/ 빌드 결과를 한 파일짜리 HTML로 묶는다 (claude.ai 아티팩트 미리보기 배포용)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2] ?? 'dist/brief-artifact.html';
const assets = readdirSync('dist/assets');
const js = readFileSync(join('dist/assets', assets.find((f) => f.endsWith('.js'))), 'utf8').replace(/<\/script/gi, '<\\/script');
const css = readFileSync(join('dist/assets', assets.find((f) => f.endsWith('.css'))), 'utf8');

writeFileSync(
  out,
  `<title>채움 ver2.0</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>${css}</style>
<div id="root"></div>
<script type="module">${js}</script>
`,
);
console.log(`wrote ${out}`);
