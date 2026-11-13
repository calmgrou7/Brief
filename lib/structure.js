// Claude로 받아쓴 텍스트를 상담기록 항목으로 정리
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';

export const MEETING_TYPES = ['코칭', '기업컨설팅', '영업상담', '정책자금', '기타'];

export const RecordSchema = z.object({
  고객명: z.string().describe('회사명 + 담당자. 예: ○○식품 김대표. 모르면 "미확인"'),
  미팅일: z.string().describe('YYYY-MM-DD. 언급 없으면 녹음일'),
  미팅유형: z.enum(MEETING_TYPES),
  참석자: z.string(),
  핵심요약: z.string().describe('2~3문장'),
  고객문제: z.string().describe('항목을 " / "로 구분'),
  제안내용: z.string().describe('항목을 " / "로 구분'),
  액션아이템: z.string().describe('"• 담당자: 할 일 (기한)" 형식, 줄바꿈으로 구분'),
  다음미팅: z.string().describe('YYYY-MM-DD. 언급 없으면 빈 문자열'),
  관계메모: z.string(),
  상태: z.enum(['신규', '후속필요']),
});

const SYSTEM = `너는 기업컨설턴트·코치의 상담기록 비서다.
입력은 컨설턴트가 미팅 직후 혼자 말한 음성메모를 받아쓴 텍스트다.
받아쓰기 오류(고유명사, 숫자)는 문맥에 맞게 보정하되, 말하지 않은 내용은 절대 지어내지 말고 "미언급"으로 둔다.
- 날짜는 YYYY-MM-DD. "오늘"은 녹음일 기준, "27일"처럼 일만 말하면 녹음일 이후 가장 가까운 날짜.
- 금액·숫자·기한은 원문 그대로 보존한다.
- 액션아이템이나 다음 미팅이 있으면 상태는 "후속필요", 없으면 "신규".
- 미팅유형은 내용에 가장 가까운 것 하나. 사용자가 유형을 지정했으면 그것을 따른다.`;

let client;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

export async function structureTranscript(transcript, { recordedAt, meetingType, clientHint } = {}) {
  const hints = [
    `녹음일: ${recordedAt}`,
    meetingType ? `사용자가 지정한 미팅유형: ${meetingType}` : null,
    clientHint ? `사용자가 입력한 고객명 힌트: ${clientHint}` : null,
  ].filter(Boolean).join('\n');

  const response = await getClient().beta.messages.parse({
    model: process.env.CLAUDE_MODEL || 'claude-opus-5-5',
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: SYSTEM,
    output_config: { effort: 'low', format: betaZodOutputFormat(RecordSchema) },
    messages: [{ role: 'user', content: `${hints}\n\n<음성메모>\n${transcript}\n</음성메모>` }],
  });

  if (response.stop_reason === 'refusal') {
    throw new Error('AI가 이 내용의 정리를 거절했어요. 원본 녹취를 직접 확인해 주세요.');
  }
  if (!response.parsed_output) throw new Error('AI 정리 결과를 읽지 못했어요.');
  return response.parsed_output;
}
