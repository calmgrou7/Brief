"""mvp/index.html(대표용) → public/index.html(고객용). staff 블록 제거."""
import re, pathlib
src = pathlib.Path('mvp/index.html').read_text(encoding='utf-8')
out = re.sub(r'<!-- staff:start -->.*?<!-- staff:end -->', '', src, flags=re.S)
out = re.sub(r', rate: \d+', '', out)
out = out.replace('<title>뷰티커넥트 MVP</title>', '<title>뷰티커넥트</title>', 1)
out = out.replace('<p class="eyebrow">Beauty Connector · MVP v0.1</p>', '<p class="eyebrow">Beauty Connector · Beta</p>')
page = '<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="description" content="검증된 화장품과 에스테틱을 내 피부에 맞게 연결해 드립니다. 3분 피부 진단과 1:1 상담.">\n' + out.replace('<header>', '</head>\n<body>\n<header>', 1) + '\n</body>\n</html>\n'
pathlib.Path('public').mkdir(exist_ok=True)
pathlib.Path('public/index.html').write_text(page, encoding='utf-8')
print('staff blocks left:', page.count('v-admin'), page.count('v-model'))

# 플랫폼 디자인 (NEW BEAUTY NEXUS) → public/platform/index.html
plat = pathlib.Path('platform/index.html').read_text(encoding='utf-8')
plat_page = '<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="description" content="뷰티 비즈니스의 시작부터 전환까지, 필요한 사람·제품·기술·정보를 연결합니다.">\n' + plat.replace('<header>', '</head>\n<body>\n<header>', 1) + '\n</body>\n</html>\n'
pathlib.Path('public/platform').mkdir(parents=True, exist_ok=True)
pathlib.Path('public/platform/index.html').write_text(plat_page, encoding='utf-8')
print('platform built')
