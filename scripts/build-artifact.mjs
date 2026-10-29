// dist/ 빌드 결과를 한 파일짜리 HTML로 묶는다 (claude.ai 아티팩트 미리보기 배포용)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// --standalone: 내려받아 더블클릭으로 여는 완전한 HTML(출력 가능)
const standalone = process.argv.includes('--standalone');
const out = process.argv.filter((a) => !a.startsWith('--'))[2] ?? 'dist/brief-artifact.html';
const assets = readdirSync('dist/assets');
const js = readFileSync(join('dist/assets', assets.find((f) => f.endsWith('.js'))), 'utf8').replace(/<\/script/gi, '<\\/script');
const css = readFileSync(join('dist/assets', assets.find((f) => f.endsWith('.css'))), 'utf8');

const body = `<title>채움 ver2.0</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>${css}</style>
<div id="root"></div>
<script type="module">${js}</script>
`;
writeFileSync(
  out,
  standalone ? `<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n</head>\n<body>\n${body}</body>\n</html>\n` : body,
);
console.log(`wrote ${out}`);
