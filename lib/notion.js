// Notion 상담기록 DB에 한 건 저장
const NOTION_VERSION = '2022-06-28';
const LIMIT = 1900; // Notion rich_text 한 칸 2000자 제한 대비

const text = (v) => {
  const s = String(v ?? '');
  const chunks = [];
  for (let i = 0; i < s.length && chunks.length < 50; i += LIMIT) chunks.push({ text: { content: s.slice(i, i + LIMIT) } });
  return { rich_text: chunks };
};
const date = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v || '') ? { date: { start: v } } : { date: null });

export async function saveToNotion(record, transcript) {
  const properties = {
    고객명: { title: [{ text: { content: (record.고객명 || '미확인').slice(0, LIMIT) } }] },
    미팅일: date(record.미팅일),
    미팅유형: { select: { name: record.미팅유형 || '기타' } },
    참석자: text(record.참석자),
    핵심요약: text(record.핵심요약),
    '고객 문제·니즈': text(record.고객문제),
    '제안 내용': text(record.제안내용),
    액션아이템: text(record.액션아이템),
    '다음 미팅': date(record.다음미팅),
    '관계 메모': text(record.관계메모),
    상태: { select: { name: record.상태 || '신규' } },
    '원본 녹취': text(transcript),
  };

  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      'notion-version': NOTION_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ parent: { database_id: process.env.NOTION_DATABASE_ID }, properties }),
  });
  if (!res.ok) throw new Error(`Notion 저장 실패 (${res.status}): ${await res.text()}`);
  const page = await res.json();
  return page.url;
}
