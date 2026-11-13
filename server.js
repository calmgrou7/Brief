import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transcribe } from './lib/assemblyai.js';
import { structureTranscript, RecordSchema, MEETING_TYPES } from './lib/structure.js';
import { saveToNotion } from './lib/notion.js';
import { DEMO_TRANSCRIPT, demoRecord, sleep } from './lib/demo.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const has = {
  stt: Boolean(process.env.ASSEMBLYAI_API_KEY),
  ai: Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN),
  notion: Boolean(process.env.NOTION_TOKEN && process.env.NOTION_DATABASE_ID),
};
const WORD_BOOST = (process.env.WORD_BOOST || '').split(',').map((s) => s.trim()).filter(Boolean);

// 공개 URL로 배포할 때 아무나 API 크레딧을 쓰지 못하게 하는 간단한 접속 코드
function checkPasscode(req, res, next) {
  const code = process.env.APP_PASSCODE;
  if (!code) return next();
  const given = req.get('x-passcode') || '';
  const ok = given.length === code.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(code));
  if (!ok) return res.status(401).json({ error: '접속 코드가 맞지 않아요.' });
  next();
}

app.use(express.static(path.join(here, 'public')));

app.get('/api/config', (req, res) => {
  res.json({ configured: has, meetingTypes: MEETING_TYPES, passcodeRequired: Boolean(process.env.APP_PASSCODE) });
});

// 작업 상태는 메모리에 잠깐만 보관 (30분 후 삭제)
const jobs = new Map();
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, job] of jobs) if (job.createdAt < cutoff) jobs.delete(id);
}, 5 * 60 * 1000).unref();

async function runJob(job, audio, meta) {
  try {
    job.status = 'transcribing';
    if (has.stt) {
      job.transcript = await transcribe(audio, { wordBoost: WORD_BOOST });
    } else {
      await sleep(1500);
      job.transcript = DEMO_TRANSCRIPT;
    }
    if (!job.transcript.trim()) throw new Error('음성에서 말소리를 찾지 못했어요. 다시 녹음해 주세요.');

    job.status = 'structuring';
    if (has.ai) {
      job.record = await structureTranscript(job.transcript, meta);
    } else {
      await sleep(1500);
      job.record = demoRecord(meta.recordedAt);
      if (meta.meetingType) job.record.미팅유형 = meta.meetingType;
      if (meta.clientHint) job.record.고객명 = meta.clientHint;
    }
    job.status = 'ready';
  } catch (err) {
    console.error(err);
    job.status = 'error';
    job.error = err.message;
  }
}

app.post(
  '/api/jobs',
  checkPasscode,
  express.raw({ type: () => true, limit: '60mb' }),
  (req, res) => {
    if (!req.body?.length) return res.status(400).json({ error: '음성 파일이 비어 있어요.' });
    const decode = (v) => { try { return decodeURIComponent(v || ''); } catch { return ''; } };
    const recordedAt = /^\d{4}-\d{2}-\d{2}$/.test(req.get('x-recorded-at') || '')
      ? req.get('x-recorded-at')
      : new Date().toISOString().slice(0, 10);
    const meetingType = MEETING_TYPES.includes(decode(req.get('x-meeting-type'))) ? decode(req.get('x-meeting-type')) : '';
    const meta = { recordedAt, meetingType, clientHint: decode(req.get('x-client-hint')).slice(0, 100) };

    const id = crypto.randomUUID();
    const job = { id, status: 'queued', createdAt: Date.now(), demo: { stt: !has.stt, ai: !has.ai } };
    jobs.set(id, job);
    runJob(job, req.body, meta);
    res.status(202).json({ id });
  },
);

app.get('/api/jobs/:id', checkPasscode, (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: '작업을 찾을 수 없어요. 다시 녹음해 주세요.' });
  const { id, status, transcript, record, error, demo } = job;
  res.json({ id, status, transcript, record, error, demo });
});

app.post('/api/save', checkPasscode, express.json({ limit: '1mb' }), async (req, res) => {
  const parsed = RecordSchema.safeParse(req.body?.record);
  if (!parsed.success) return res.status(400).json({ error: '저장할 항목 형식이 올바르지 않아요.' });
  const transcript = String(req.body?.transcript || '').slice(0, 90000);
  if (!has.notion) {
    return res.status(501).json({ error: 'Notion이 아직 연결되지 않았어요. 복사하기를 이용하거나 .env에 Notion 정보를 넣어주세요.' });
  }
  try {
    const url = await saveToNotion(parsed.data, transcript);
    res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: err.message });
  }
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  const mode = (ok) => (ok ? '연결됨' : '데모');
  console.log(`Brief 미니앱 실행: http://localhost:${port}`);
  console.log(`  받아쓰기(AssemblyAI): ${mode(has.stt)} / AI 정리(Claude): ${mode(has.ai)} / Notion 저장: ${has.notion ? '연결됨' : '미연결'}`);
});
