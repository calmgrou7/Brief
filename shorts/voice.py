"""슬라이드별 내레이션(한국어 TTS) 생성 + 슬라이드 길이 자동 맞춤.
사용법:
  python3 shorts/voice.py shorts/ep01            → ep/voice.wav, ep/timing.json
  python3 shorts/voice.py shorts/ep01 --samples  → 후보 목소리 샘플(samples/*.wav) 생성

slides.json의 "voice" 설정:
  {"engine": "google", "name": "ko-KR-Chirp3-HD-Algieba", "speed": 1.0}   # 남성·자연스러운 음성 (API 키 필요)
  {"engine": "local",  "model": "vits-mimic3-ko_KO-kss_low", "speed": 1.08} # 오프라인 무료 여성 음성
"""
import base64, io, json, re, sys, tarfile, urllib.request
from pathlib import Path
import numpy as np
import soundfile as sf

HERE = Path(__file__).parent
ep_dir = Path(sys.argv[1] if len(sys.argv) > 1 else HERE / "ep01")
ep = json.loads((ep_dir / "slides.json").read_text())
vcfg = {"engine": "local", "model": "vits-mimic3-ko_KO-kss_low", "speed": 1.0, "pad": 0.8, "lead": 0.35, **ep.get("voice", {})}

# 남성·온화한 톤 후보 (Google Chirp3-HD 한국어)
MALE_CANDIDATES = {
    "ko-KR-Chirp3-HD-Algieba": "부드러움",
    "ko-KR-Chirp3-HD-Achird": "친근함",
    "ko-KR-Chirp3-HD-Umbriel": "편안함",
    "ko-KR-Chirp3-HD-Schedar": "차분함",
}


# ---------- 엔진 ----------
def google_tts(text, name, speed):
    body = {
        "input": {"text": text},
        "voice": {"languageCode": "ko-KR", "name": name},
        "audioConfig": {"audioEncoding": "LINEAR16", "sampleRateHertz": 48000, "speakingRate": speed},
    }
    req = urllib.request.Request(
        "https://texttospeech.googleapis.com/v1/text:synthesize",
        data=json.dumps(body).encode(),
        # 키 값은 네트워크 프록시가 주입 (코드·저장소에 키를 두지 않음)
        headers={"Content-Type": "application/json", "X-Goog-Api-Key": "proxy-injected"},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        wav = base64.b64decode(json.load(r)["audioContent"])
    data, sr = sf.read(io.BytesIO(wav), dtype="float32")
    return data, sr


_local = None
def local_tts(text, speed):
    global _local
    import sherpa_onnx
    if _local is None:
        model_dir = HERE / ".models" / vcfg["model"]
        if not model_dir.exists():
            url = f"https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/{vcfg['model']}.tar.bz2"
            print("downloading", url)
            model_dir.parent.mkdir(parents=True, exist_ok=True)
            tmp = model_dir.parent / "model.tar.bz2"
            urllib.request.urlretrieve(url, tmp)
            with tarfile.open(tmp) as t:
                t.extractall(model_dir.parent, filter="data")
            tmp.unlink()
        _local = sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(
            model=sherpa_onnx.OfflineTtsModelConfig(
                vits=sherpa_onnx.OfflineTtsVitsModelConfig(
                    model=str(next(model_dir.glob("*.onnx"))), tokens=str(model_dir / "tokens.txt"),
                    data_dir=str(model_dir / "espeak-ng-data")),
                num_threads=4)))
    # 로컬 모델은 물음표·느낌표를 모름 → 쉼표로
    text = re.sub(r"[?!]+", ",", text)
    text = re.sub(r"[^\w\s.,가-힣]", " ", text).strip()
    a = _local.generate(text, sid=0, speed=speed)
    return np.asarray(a.samples, dtype=np.float32), a.sample_rate


def synth(text, name=None):
    if vcfg["engine"] == "google":
        return google_tts(text, name or vcfg["name"], vcfg["speed"])
    return local_tts(text, vcfg["speed"])


# ---------- 다듬기 ----------
def smooth(clip, sr):
    """앞뒤 무음 정리 + 10ms 페이드 (클릭·뚝 끊김 방지)"""
    if len(clip) == 0:
        return clip
    if clip.ndim > 1:
        clip = clip.mean(axis=1)
    thr = 0.01 * np.max(np.abs(clip))
    idx = np.where(np.abs(clip) > thr)[0]
    clip = clip[max(0, idx[0] - int(.03 * sr)): idx[-1] + int(.08 * sr)]
    f = int(.01 * sr)
    clip[:f] *= np.linspace(0, 1, f)
    clip[-f:] *= np.linspace(1, 0, f)
    return clip


if "--samples" in sys.argv:
    out = ep_dir / "samples"
    out.mkdir(exist_ok=True)
    line = ep["slides"][0]["narration"]
    for name, mood in MALE_CANDIDATES.items():
        clip, sr = synth(line, name)
        sf.write(out / f"{name.split('-')[-1]}_{mood}.wav", smooth(clip, sr), sr)
        print("sample", name, mood)
    sys.exit()

clips, durs, sr = [], [], 48000
for s in ep["slides"]:
    text = s.get("narration", "").strip()
    clip = np.zeros(0, dtype=np.float32)
    if text:
        clip, sr = synth(text)
        clip = smooth(clip, sr)
    clips.append(clip)
    durs.append(round(max(s["dur"], vcfg["lead"] + len(clip) / sr + vcfg["pad"]), 2))

track = np.zeros(int(sum(durs) * sr) + sr, dtype=np.float32)
t = 0.0
for clip, d in zip(clips, durs):
    i = int((t + vcfg["lead"]) * sr)
    track[i:i + len(clip)] += clip
    t += d
track = track[: int(sum(durs) * sr)]
track = track / (np.max(np.abs(track)) + 1e-9) * 0.9
sf.write(ep_dir / "voice.wav", track, sr)
(ep_dir / "timing.json").write_text(json.dumps({"durs": durs}, indent=2))
print("voice.wav", vcfg["engine"], f"{sum(durs):.1f}s", durs)
