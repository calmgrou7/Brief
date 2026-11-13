// Brief 미니앱 – 녹음 → 받아쓰기 → 정리 → 확인 → Notion 저장
const $ = (s) => document.querySelector(s);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장 불가 환경 무시 */ } },
};

const state = { config: null, meetingType: '', jobId: null, record: null, transcript: '' };

// ---------- 공통 ----------
function show(name) {
  document.querySelectorAll('.screen').forEach((el) => el.classList.toggle('active', el.id === `screen-${name}`));
  window.scrollTo({ top: 0 });
}
let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}
function localDate() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
async function api(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  const code = store.get('passcode', '');
  if (code) headers['x-passcode'] = code;
  const res = await fetch(path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    const entered = prompt('접속 코드를 입력하세요');
    if (entered) { store.set('passcode', entered); return api(path, opts); }
  }
  if (!res.ok) throw Object.assign(new Error(data.error || `요청 실패 (${res.status})`), { status: res.status });
  return data;
}

// ---------- 초기화 ----------
async function init() {
  state.config = await api('/api/config');
  const { configured, meetingTypes } = state.config;

  const missing = [];
  if (!configured.stt) missing.push('받아쓰기');
  if (!configured.ai) missing.push('AI 정리');
  if (missing.length) {
    const b = $('#demoBanner');
    b.hidden = false;
    b.textContent = `데모 모드: ${missing.join('·')}는 예시 결과로 보여드려요. API 키를 넣으면 실제로 동작해요.`;
  }
  if (!configured.notion) $('#saveBtn').textContent = 'Notion 미연결 (복사로 저장)';

  const chips = $('#typeChips');
  meetingTypes.forEach((t) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.textContent = t;
    b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false');
    b.onclick = () => {
      state.meetingType = state.meetingType === t ? '' : t;
      chips.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-checked', String(c.textContent === state.meetingType)));
      store.set('lastType', state.meetingType);
    };
    chips.appendChild(b);
  });
  const last = store.get('lastType', '');
  if (last) [...chips.children].find((c) => c.textContent === last)?.click();
}

// ---------- 녹음 ----------
let recorder, chunks = [], startedAt = 0, timerId, audioCtx, analyser, rafId, stream;

function pickMime() {
  const types = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'];
  return types.find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || '';
}

async function startRecording() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  } catch {
    toast('마이크 권한이 필요해요. 브라우저 설정에서 허용해 주세요.');
    return;
  }
  const mimeType = pickMime();
  recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  chunks = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  recorder.onstop = () => {
    stream.getTracks().forEach((t) => t.stop());
    const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
    if (blob.size < 2000) { toast('녹음이 너무 짧아요. 다시 시도해 주세요.'); return; }
    submitAudio(blob);
  };
  recorder.start(1000);
  startedAt = Date.now();
  $('#recBtn').classList.add('recording');
  $('#recBtn').setAttribute('aria-label', '녹음 종료');
  $('#recHint').textContent = '말씀이 끝나면 다시 눌러주세요';
  timerId = setInterval(updateTimer, 250);
  drawMeter();
}

function stopRecording() {
  clearInterval(timerId);
  cancelAnimationFrame(rafId);
  audioCtx?.close();
  audioCtx = null;
  $('#recBtn').classList.remove('recording');
  $('#recBtn').setAttribute('aria-label', '녹음 시작');
  $('#recHint').textContent = '버튼을 눌러 녹음 시작';
  $('#recTimer').textContent = '00:00';
  if (recorder?.state === 'recording') recorder.stop();
}

function updateTimer() {
  const s = Math.floor((Date.now() - startedAt) / 1000);
  $('#recTimer').textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  if (s >= 15 * 60) { toast('15분이 지나 녹음을 마쳤어요.'); stopRecording(); }
}

function drawMeter() {
  const canvas = $('#meter');
  const ctx = canvas.getContext('2d');
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    audioCtx.createMediaStreamSource(stream).connect(analyser);
  } catch { return; }
  const data = new Uint8Array(analyser.frequencyBinCount);
  const color = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#e0563b';
  const loop = () => {
    analyser.getByteFrequencyData(data);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const bars = 28, w = canvas.width / bars;
    for (let i = 0; i < bars; i++) {
      const v = data[i % data.length] / 255;
      const h = Math.max(3, v * canvas.height);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.35 + v * 0.65;
      ctx.fillRect(i * w + 2, (canvas.height - h) / 2, w - 4, h);
    }
    rafId = requestAnimationFrame(loop);
  };
  loop();
}

$('#recBtn').onclick = () => (recorder?.state === 'recording' ? stopRecording() : startRecording());
$('#fileInput').onchange = (e) => {
  const f = e.target.files?.[0];
  e.target.value = '';
  if (f) submitAudio(f);
};

// ---------- 처리 ----------
function setStep(step) {
  const order = ['upload', 'transcribing', 'structuring'];
  const idx = order.indexOf(step);
  document.querySelectorAll('.steps li').forEach((li) => {
    const i = order.indexOf(li.dataset.step);
    li.classList.toggle('done', i < idx);
    li.classList.toggle('active', i === idx);
  });
}

async function submitAudio(blob) {
  show('progress');
  setStep('upload');
  try {
    const { id } = await api('/api/jobs', {
      method: 'POST',
      headers: {
        'content-type': blob.type || 'application/octet-stream',
        'x-recorded-at': localDate(),
        'x-meeting-type': encodeURIComponent(state.meetingType),
        'x-client-hint': encodeURIComponent($('#clientHint').value.trim()),
      },
      body: blob,
    });
    state.jobId = id;
    await poll(id);
  } catch (err) {
    toast(err.message);
    show('record');
  }
}

async function poll(id) {
  for (;;) {
    await new Promise((r) => setTimeout(r, 1500));
    const job = await api(`/api/jobs/${id}`);
    if (job.status === 'transcribing' || job.status === 'queued') setStep('transcribing');
    if (job.status === 'structuring') setStep('structuring');
    if (job.status === 'error') throw new Error(job.error || '처리 중 오류가 났어요.');
    if (job.status === 'ready') {
      state.record = job.record;
      state.transcript = job.transcript;
      renderReview();
      show('review');
      return;
    }
  }
}

// ---------- 확인·수정 ----------
const FIELDS = [
  ['고객명', 'text'],
  [['미팅일', 'date'], ['다음미팅', 'date', '다음 미팅']],
  [['미팅유형', 'select'], ['상태', 'select']],
  ['참석자', 'text'],
  ['핵심요약', 'area'],
  ['고객문제', 'area', '고객 문제·니즈'],
  ['제안내용', 'area', '제안 내용'],
  ['액션아이템', 'area'],
  ['관계메모', 'area', '관계 메모'],
];

function fieldEl(key, kind, label = key) {
  const wrap = document.createElement('div');
  wrap.className = 'row';
  const id = `f-${key}`;
  const lab = Object.assign(document.createElement('label'), { htmlFor: id, textContent: label });
  let input;
  if (kind === 'area') {
    input = document.createElement('textarea');
    input.rows = 2;
    input.addEventListener('input', () => autosize(input));
  } else if (kind === 'select') {
    input = document.createElement('select');
    const opts = key === '상태' ? ['신규', '후속필요'] : state.config.meetingTypes;
    opts.forEach((o) => input.appendChild(new Option(o, o)));
  } else {
    input = document.createElement('input');
    input.type = kind;
  }
  input.id = id;
  input.name = key;
  input.value = state.record[key] ?? '';
  wrap.append(lab, input);
  return wrap;
}

function autosize(el) {
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight + 2}px`;
}

function renderReview() {
  const form = $('#reviewForm');
  form.innerHTML = '';
  FIELDS.forEach((f) => {
    if (Array.isArray(f[0])) {
      const g = document.createElement('div');
      g.className = 'row grid2';
      f.forEach(([k, kind, label]) => { const el = fieldEl(k, kind, label); el.classList.remove('row'); g.appendChild(el); });
      form.appendChild(g);
    } else {
      form.appendChild(fieldEl(...f));
    }
  });
  $('#transcriptText').textContent = state.transcript;
  requestAnimationFrame(() => form.querySelectorAll('textarea').forEach(autosize));
}

function readForm() {
  const rec = {};
  new FormData($('#reviewForm')).forEach((v, k) => { rec[k] = String(v).trim(); });
  return { ...state.record, ...rec };
}

function asText(r) {
  return [
    `■ ${r.고객명} (${r.미팅유형}) – ${r.미팅일}`,
    `참석자: ${r.참석자}`,
    `\n[핵심요약]\n${r.핵심요약}`,
    `\n[고객 문제·니즈]\n${r.고객문제}`,
    `\n[제안 내용]\n${r.제안내용}`,
    `\n[액션아이템]\n${r.액션아이템}`,
    `\n다음 미팅: ${r.다음미팅 || '미정'}`,
    `관계 메모: ${r.관계메모}`,
  ].join('\n');
}

$('#copyBtn').onclick = async () => {
  const text = asText(readForm());
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch {
    // 권한이 없거나 http 환경일 때 대체 방법
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
  }
  toast(ok ? '복사했어요. 카톡·메일에 붙여넣으세요.' : '복사에 실패했어요. 원본 내용을 길게 눌러 복사해 주세요.');
};

$('#saveBtn').onclick = async () => {
  const record = readForm();
  if (!state.config.configured.notion) { $('#copyBtn').click(); return; }
  const btn = $('#saveBtn');
  btn.disabled = true; btn.textContent = '저장 중…';
  try {
    const { url } = await api('/api/save', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ record, transcript: state.transcript }),
    });
    const hist = store.get('history', []);
    hist.unshift({ name: record.고객명, date: record.미팅일, type: record.미팅유형, url });
    store.set('history', hist.slice(0, 20));
    $('#notionLink').href = url;
    $('#doneSub').textContent = `${record.고객명} · ${record.미팅일} 상담기록이 Notion에 들어갔어요.`;
    $('#clientHint').value = '';
    show('done');
  } catch (err) {
    toast(err.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Notion에 저장';
  }
};

$('#retryBtn').onclick = () => show('record');
$('#newBtn').onclick = () => show('record');
$('#backBtn').onclick = () => show('record');
$('#historyBtn').onclick = () => {
  const list = $('#historyList');
  list.innerHTML = '';
  const hist = store.get('history', []);
  if (!hist.length) list.innerHTML = '<li class="meta">아직 저장한 기록이 없어요.</li>';
  hist.forEach((h) => {
    const li = document.createElement('li');
    const a = Object.assign(document.createElement('a'), { href: h.url, target: '_blank', rel: 'noopener', textContent: h.name });
    const meta = Object.assign(document.createElement('div'), { className: 'meta', textContent: `${h.date} · ${h.type}` });
    li.append(a, meta);
    list.appendChild(li);
  });
  show('history');
};

init().catch((err) => toast(err.message));
