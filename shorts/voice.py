"""슬라이드별 내레이션(한국어 TTS) 생성 + 슬라이드 길이 자동 맞춤.
사용법: python3 shorts/voice.py shorts/ep01
 → ep/voice.wav (전체 길이 음성 트랙), ep/timing.json (슬라이드별 길이)
엔진: sherpa-onnx + Mimic3 KSS 한국어 여성 음성 (오프라인, 무료). 모델은 처음 한 번만 내려받음.
"""
import json, re, sys, tarfile, urllib.request
from pathlib import Path
import numpy as np
import soundfile as sf
import sherpa_onnx

HERE = Path(__file__).parent
ep_dir = Path(sys.argv[1] if len(sys.argv) > 1 else HERE / "ep01")
ep = json.loads((ep_dir / "slides.json").read_text())
vcfg = {"model": "vits-mimic3-ko_KO-kss_low", "speed": 1.0, "pad": 0.9, "lead": 0.35, **ep.get("voice", {})}

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

onnx = next(model_dir.glob("*.onnx"))
tts = sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(
    model=sherpa_onnx.OfflineTtsModelConfig(
        vits=sherpa_onnx.OfflineTtsVitsModelConfig(
            model=str(onnx), tokens=str(model_dir / "tokens.txt"), data_dir=str(model_dir / "espeak-ng-data")),
        num_threads=4)))

def clean(text):
    # 모델이 모르는 기호 정리: 물음표·느낌표는 쉼표로 (끊어 읽기 유지)
    text = re.sub(r"[?!]+", ",", text)
    return re.sub(r"[^\w\s.,가-힣]", " ", text).strip()

clips, durs = [], []
sr = None
for s in ep["slides"]:
    text = s.get("narration", "").strip()
    if text:
        a = tts.generate(clean(text), sid=0, speed=vcfg["speed"])
        sr = a.sample_rate
        clip = np.asarray(a.samples, dtype=np.float32)
    else:
        clip = np.zeros(0, dtype=np.float32)
    clips.append(clip)
    need = vcfg["lead"] + (len(clip) / sr if sr else 0) + vcfg["pad"]
    durs.append(round(max(s["dur"], need), 2))

track = np.zeros(int(sum(durs) * sr) + sr, dtype=np.float32)
t = 0.0
for clip, d in zip(clips, durs):
    i = int((t + vcfg["lead"]) * sr)
    track[i:i + len(clip)] += clip
    t += d
track = track[: int(sum(durs) * sr)]
track = track / (np.max(np.abs(track)) + 1e-9) * 0.95
sf.write(ep_dir / "voice.wav", track, sr)
(ep_dir / "timing.json").write_text(json.dumps({"durs": durs}, indent=2))
print("voice.wav", f"{sum(durs):.1f}s", durs)
