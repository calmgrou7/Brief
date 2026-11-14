"""Build the English and Korean Stay B pages and sitemap. Run after editing templates,
campuses.js or guides-data.js: python3 work/builds/stay-b/render_search_pages.py.
Requires Python with lxml and Node.js. Generated HTML is committed for static hosting.
"""
from html import escape
import json
from pathlib import Path
import re
import subprocess
from urllib.parse import urlsplit
from xml.etree import ElementTree as ET

from lxml import etree, html

HERE = Path(__file__).resolve().parent
SITE = HERE.parents[2] / 'portfolio-site' / 'stay-b'
HOST = 'https://bridgenode-portfolio.onrender.com'
PREFIX = '/stay-b/'
LANGUAGES = ('en', 'ko')
PAGES = ('index.html', 'partners.html', 'resources.html')
DETAILS = {
    'en': {
        'index.html': ('International Student Guide to Busan & Gyeongnam | Stay B',
                       'Explore 12 campuses in Busan and Gyeongnam, prepare for arrival, and find official guidance on housing, scholarships and everyday student life.'),
        'partners.html': ('University & Language School Partnerships in Busan and Gyeongnam | Stay B',
                          'Explore the proposed Stay B pilot for universities, language schools and local partners supporting international students in Busan and Gyeongnam.'),
        'resources.html': ('Official Student Resources for Busan & Gyeongnam | Stay B',
                           'Find the official sources for Korean government scholarships, student housing, health insurance and immigration questions while studying in Busan or Gyeongnam.'),
    },
    'ko': {
        'index.html': ('부산·경남 외국인 유학생 생활 가이드 | 스테이B',
                       '부산·경남 12개 캠퍼스의 한글 주소와 학교 홈페이지를 찾아보세요. 입국 준비부터 기숙사, 장학금, 정착 생활까지 단계별 안내와 공식 출처를 제공합니다.'),
        'partners.html': ('부산·경남 유학생 지원 대학·어학원 협력 안내 | 스테이B',
                          '부산·경남 외국인 유학생 정착 지원을 준비하는 대학, 어학원, 지역 기관을 위한 스테이B 시범 운영안과 협력 절차, 기관별 역할을 소개합니다.'),
        'resources.html': ('부산·경남 유학생 장학금·기숙사·체류 공식 안내 | 스테이B',
                           '정부초청장학금, 유학생 기숙사, 외국인 건강보험, 체류 문의를 어디에서 확인할 수 있는지 질문별로 안내하고 담당 기관의 원문으로 연결합니다.'),
    },
}


def path_for(page, lang):
    directory = PREFIX + ('ko/' if lang == 'ko' else '')
    return directory if page == 'index.html' else directory + page


def by_id(doc, identifier):
    return doc.get_element_by_id(identifier)


def parse_template(name):
    source = (HERE / 'templates' / name).read_text()
    # Keep the original spelling of attributes in inline SVG (viewBox, clipPath).
    drawings = []
    def protect(match):
        drawings.append(match.group())
        return f'<!--drawing-{len(drawings)-1}-->'
    source = re.sub(r'<svg\b.*?</svg>', protect, source, flags=re.S)
    return html.document_fromstring(source), drawings


def metadata(doc, page, lang, citations):
    head = doc.find('head')
    title, description = DETAILS[lang][page]
    url = HOST + path_for(page, lang)
    image = HOST + PREFIX + 'assets/journal/' + ('alley-960.webp' if page == 'partners.html' else 'beach-1600.webp')
    etree.SubElement(head, 'title').text = title
    def meta(attr, key, value):
        etree.SubElement(head, 'meta', {attr:key, 'content':value})
    meta('name', 'description', description)
    meta('name', 'robots', 'index,follow,max-image-preview:large')
    etree.SubElement(head, 'link', rel='canonical', href=url)
    for code, target in [('en','en'), ('ko','ko'), ('x-default','en')]:
        etree.SubElement(head, 'link', rel='alternate', hreflang=code, href=HOST+path_for(page,target))
    locale = {'en':'en_US','ko':'ko_KR'}
    for key, value in [('type','website'), ('url',url), ('title',title), ('description',description),
                       ('site_name','Stay B · 부산·경남'), ('locale',locale[lang]),
                       ('locale:alternate',locale['ko' if lang=='en' else 'en']), ('image',image)]:
        meta('property', 'og:'+key, value)
    for key, value in [('card','summary_large_image'), ('title',title), ('description',description), ('image',image)]:
        meta('name', 'twitter:'+key, value)
    publisher = {'@type':'Organization', 'name':'BRIDGENODE', 'url':HOST+'/'}
    item = {'@context':'https://schema.org', '@type': 'CollectionPage' if page == 'resources.html' else 'WebPage',
            '@id':url+'#webpage', 'url':url, 'name':title, 'description':description, 'inLanguage':lang,
            'publisher':publisher, 'isPartOf':{'@type':'WebSite', '@id':HOST+PREFIX+'#website',
            'name':'Stay B Busan · Gyeongnam', 'url':HOST+PREFIX, 'inLanguage':list(LANGUAGES)}}
    if citations:
        item['citation'] = list(dict.fromkeys(citations))
    etree.SubElement(head,'script',type='application/ld+json').text = json.dumps(item,ensure_ascii=False,indent=2)


def localize(doc, page, lang):
    doc.set('lang',lang)
    for el in doc.xpath('//*[@data-l] | //*[contains(concat(" ",normalize-space(@class)," ")," pair ")]/*[@lang]'):
        if el.get('data-l',el.get('lang')) != lang:
            el.drop_tree()
    for el in doc.xpath('//*[@data-label-en]'):
        el.set('aria-label',el.get('data-label-'+lang))
    for el in doc.xpath('//*[@data-url-en]'):
        el.set('href',el.get('data-url-'+lang))
    for el in doc.xpath('//*[@data-set-lang]'):
        code = el.get('data-set-lang')
        el.tag = 'a'
        el.attrib.clear()
        el.set('href',path_for(page,code))
        el.set('lang',code)
        el.set('hreflang',code)
        el.set('data-edition',code)
        if code==lang:
            el.set('aria-current','page')
    for el in doc.xpath('//*[@src or @href or @srcset]'):
        for attr in ['src','href']:
            value = el.get(attr,'')
            if value.startswith(('assets/','favicon')):
                el.set(attr,PREFIX+value)
            elif value.startswith('index.html'):
                el.set(attr,path_for('index.html',lang)+value[len('index.html'):])
            elif value in ('partners.html','resources.html'):
                el.set(attr,path_for(value,lang))
            elif value=='../':
                el.set(attr,'/')
        if el.get('srcset'):
            el.set('srcset',el.get('srcset').replace('assets/',PREFIX+'assets/'))


def render_handbook(doc, guides, lang):
    panels = by_id(doc,'stage-panels')
    pending = 'to be confirmed' if lang=='en' else '확인 예정'
    def safe(value):
        return escape(value.replace('[[tbc]]','('+pending+')'))
    for stage in guides['stages']:
        section = etree.SubElement(panels,'section',id='guides-'+stage['key'])
        etree.SubElement(section,'h3').text = stage['name'][lang]
        for card in [c for c in guides['cards'] if c['stage']==stage['key']]:
            entry = etree.SubElement(section,'details',id='guide-'+card['id'],attrib={'class':'j-entry'})
            etree.SubElement(entry,'summary').text = card['title'][lang]
            points = ''.join('<li>'+safe(p)+'</li>' for p in card['points'][lang])
            tag = 'ol' if card['list']=='num' else 'ul'
            markup = '<div class="j-entry-content"><p>'+safe(card['sum'][lang])+'</p><'+tag+'>'+points+'</'+tag+'>'
            if card.get('note'):
                markup += '<p>'+safe(card['note'][lang])+'</p>'
            markup += '<p>'+('Source: ' if lang=='en' else '출처 · ')+safe(card['source'][lang])+'</p>'
            if card.get('guideUrl'):
                markup += '<a href="'+escape(card['guideUrl'],quote=True)+'">'+('Official guidance' if lang=='en' else '공식 안내 보기')+'</a>'
            entry.append(html.fragment_fromstring(markup+'</div>'))


def render_campuses(doc, data, lang):
    listing = by_id(doc,'sb-campus-list')
    for campus in data['items']:
        entry = etree.SubElement(etree.SubElement(listing,'li'),'details')
        etree.SubElement(entry,'summary').text = campus[lang]
        info = etree.SubElement(entry,'div',attrib={'class':'sb-detail'})
        other = 'en' if lang=='ko' else 'ko'
        etree.SubElement(info,'p',lang=other).text = campus[other]
        etree.SubElement(info,'p',lang='ko').text = campus['address']
        raw = campus['website']
        url = raw if '://' in raw else 'https://'+raw
        host = urlsplit(url)
        if host.scheme in ('http','https') and (host.hostname or '').endswith('.ac.kr'):
            etree.SubElement(info,'a',href=url).text = 'University website' if lang=='en' else '학교 홈페이지'
    by_id(doc,'sb-date').text = (' · Data as of ' if lang=='en' else ' · 자료 기준 ')+', '.join(sorted({c['asOf'] for c in data['items']}))
    count = len(data['items'])
    by_id(doc,'sb-count').text = f'{count} campuses' if lang=='en' else f'{count}개 캠퍼스'


def write_pages():
    # Read the same data files that power the enhanced search and tabs.
    data = json.loads((SITE/'assets/local/campuses.js').read_text().split('=',1)[1].strip().removesuffix(';'))
    guide_file = str((SITE/'assets/guides-data.js').resolve())
    js = 'global.window={};require(process.argv[1]);process.stdout.write(JSON.stringify(window.STAYB_GUIDES))'
    guides = json.loads(subprocess.check_output(['node','-e',js,guide_file]))
    for page in PAGES:
        for lang in LANGUAGES:
            template = 'index.html' if page=='resources.html' else page
            doc, drawings = parse_template(template)
            if page=='resources.html':
                main = by_id(doc,'main')
                for child in list(main):
                    main.remove(child)
                main.append(html.fragment_fromstring((HERE/'templates'/f'resources-{lang}.html').read_text()))
                # Links in the reused header/footer target the main student edition.
                for el in doc.xpath('//header[contains(@class,"site-header")]//a[starts-with(@href,"#")] | //footer//a[starts-with(@href,"#")]'):
                    el.set('href','index.html'+el.get('href'))
                for el in doc.xpath('//script[@src]'):
                    if el.get('src') not in ('assets/common.js','assets/editorial/navigation.js','assets/journal/motion.js'):
                        el.drop_tree()
                for el in doc.xpath('//*[@id="sticky-cta"]'):
                    el.drop_tree()
            localize(doc,page,lang)
            if page in ('index.html','partners.html'):
                # Demo forms rely on JS to prevent submission. With JS off, show
                # the existing demo notice, while keeping the public guide readable.
                fallback = etree.SubElement(doc.find('head'),'noscript')
                etree.SubElement(fallback,'style').text = '.sb-search,.sb-regions,.tabs-bar,#ask-form,#partner-form{display:none}'
            if page=='resources.html':
                for el in doc.xpath('//figure | //details[contains(@class,"j-credits")]'):
                    el.drop_tree()
            if page=='index.html':
                render_campuses(doc,data,lang)
                render_handbook(doc,guides,lang)
            sources = [el.get('href') for el in doc.xpath('//main//a[@data-url-en] | //main//*[@class="resource-answer"]/a')]
            if page=='index.html':
                sources.append(data['source'])
            metadata(doc,page,lang,sources)
            encoded = html.tostring(doc,encoding='unicode',method='html',doctype='<!doctype html>')
            for index,svg in enumerate(drawings):
                encoded = encoded.replace(f'<!--drawing-{index}-->',svg)
            path = SITE/('ko' if lang=='ko' else '')/page
            path.parent.mkdir(exist_ok=True)
            path.write_text(encoded+'\n')
    sitemap = ET.Element('urlset',xmlns='http://www.sitemaps.org/schemas/sitemap/0.9')
    for page in PAGES:
        for lang in LANGUAGES:
            ET.SubElement(ET.SubElement(sitemap,'url'),'loc').text = HOST+path_for(page,lang)
    ET.indent(sitemap)
    (SITE/'sitemap.xml').write_bytes(ET.tostring(sitemap,encoding='utf-8',xml_declaration=True)+b'\n')


if __name__=='__main__':
    write_pages()
