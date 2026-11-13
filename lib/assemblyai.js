// AssemblyAI 받아쓰기: 업로드 → 변환 요청 → 완료될 때까지 확인
const BASE = 'https://api.assemblyai.com/v2';

function headers(extra = {}) {
  return { authorization: process.env.ASSEMBLYAI_API_KEY, ...extra };
}

export async function transcribe(audioBuffer, { wordBoost = [] } = {}) {
  // 1) 음성 파일 업로드
  const up = await fetch(`${BASE}/upload`, {
    method: 'POST',
    headers: headers({ 'content-type': 'application/octet-stream' }),
    body: audioBuffer,
  });
  if (!up.ok) throw new Error(`AssemblyAI 업로드 실패 (${up.status}): ${await up.text()}`);
  const { upload_url } = await up.json();

  // 2) 받아쓰기 요청 (한국어 고정)
  const body = { audio_url: upload_url, language_code: 'ko' };
  if (process.env.ASSEMBLYAI_SPEECH_MODEL) body.speech_model = process.env.ASSEMBLYAI_SPEECH_MODEL;
  if (wordBoost.length) body.word_boost = wordBoost;

  const req = await fetch(`${BASE}/transcript`, {
    method: 'POST',
    headers: headers({ 'content-type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (!req.ok) throw new Error(`AssemblyAI 변환 요청 실패 (${req.status}): ${await req.text()}`);
  const { id } = await req.json();

  // 3) 완료될 때까지 확인 (최대 약 5분)
  for (let i = 0; i < 150; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await fetch(`${BASE}/transcript/${id}`, { headers: headers() });
    if (!res.ok) throw new Error(`AssemblyAI 상태 확인 실패 (${res.status})`);
    const t = await res.json();
    if (t.status === 'completed') return t.text || '';
    if (t.status === 'error') throw new Error(`AssemblyAI 변환 오류: ${t.error}`);
  }
  throw new Error('AssemblyAI 변환 시간이 초과됐어요.');
}
