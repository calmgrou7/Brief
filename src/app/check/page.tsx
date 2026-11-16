"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QUESTIONS, type Answers } from "@/lib/diagnosis";
import { api, getAnonId, getChannel, track } from "@/lib/client";

export default function CheckPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { track("check_start"); }, []);

  const q = QUESTIONS[step];
  const val = answers[q.id];
  const exclusive = ["unknown", "none"];

  const pick = (v: string) => {
    if (!q.multi) {
      const next = { ...answers, [q.id]: v };
      setAnswers(next);
      setTimeout(() => go(next), 150);
      return;
    }
    const cur = (val as string[] | undefined) || [];
    let nextArr = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
    nextArr = exclusive.includes(v) ? (cur.includes(v) ? [] : [v]) : nextArr.filter((x) => !exclusive.includes(x));
    setAnswers({ ...answers, [q.id]: nextArr });
  };

  const go = async (a: Answers) => {
    // 병원 이용이 없으면 '청구했나요' 문항은 건너뜀
    let next = step + 1;
    if (QUESTIONS[next]?.id === "claimed" && (a.hospital || []).every((h) => h === "none")) next++;
    if (next < QUESTIONS.length) return setStep(next);
    setBusy(true);
    try {
      const r = await api<{ id: string }>("/api/diagnosis", { answers: a, anonId: getAnonId(), channel: getChannel() });
      track("check_complete");
      router.push(`/check/result?id=${r.id}`);
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  };

  const selected = (v: string) => (q.multi ? ((val as string[]) || []).includes(v) : val === v);

  return (
    <main>
      <div className="progress"><i style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }} /></div>
      <p className="small">{step + 1} / {QUESTIONS.length}</p>
      <h1 style={{ marginTop: 4 }}>{q.title}</h1>
      {q.hint && <p className="muted">{q.hint}</p>}
      <div style={{ marginTop: 16 }}>
        {q.options.map((o) => (
          <button key={o.value} type="button" className={`opt ${selected(o.value) ? "on" : ""}`} onClick={() => pick(o.value)}>{o.label}</button>
        ))}
      </div>
      {err && <p className="err">{err}</p>}
      <div className="sticky-cta">
        <div style={{ display: "flex", gap: 8 }}>
          {step > 0 && <button className="btn btn-ghost" style={{ width: "35%" }} onClick={() => setStep(step - 1)}>이전</button>}
          {q.multi && (
            <button className="btn btn-primary" disabled={busy || !((val as string[]) || []).length} onClick={() => go(answers)}>
              {busy ? "분석 중..." : "다음"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
