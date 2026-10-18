// Google AI Studio(Gemini) TTS: 대본 텍스트 → 내레이션 WAV
// 사용: GEMINI_API_KEY=... node scripts/tts.mjs script.txt out/voice.wav [voice]
import { GoogleGenAI } from "@google/genai";
import { readFileSync, writeFileSync } from "node:fs";

const [scriptPath, outPath = "out/voice.wav", voice = "Kore"] = process.argv.slice(2);
if (!scriptPath) {
  console.error("사용법: node scripts/tts.mjs <대본.txt> [출력.wav] [voice]");
  process.exit(1);
}
if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY 가 없습니다. https://aistudio.google.com/apikey 에서 발급 후 .env 에 넣으세요.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const res = await ai.models.generateContent({
  model: process.env.GEMINI_TTS_MODEL ?? "gemini-3.8-flash-tts",
  contents: [{ parts: [{ text: readFileSync(scriptPath, "utf8") }] }],
  config: {
    responseModalities: ["AUDIO"],
    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
  },
});

const b64 = res.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
if (!b64) throw new Error("오디오 응답이 비어 있습니다: " + JSON.stringify(res).slice(0, 500));

// Gemini TTS 는 24kHz / 16bit / mono PCM 을 돌려주므로 WAV 헤더를 붙인다
const pcm = Buffer.from(b64, "base64");
const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write("WAVEfmt ", 8);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(24000, 24);
header.writeUInt32LE(24000 * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(pcm.length, 40);
writeFileSync(outPath, Buffer.concat([header, pcm]));
console.log(`✓ ${outPath} (${(pcm.length / 48000).toFixed(1)}s)`);
