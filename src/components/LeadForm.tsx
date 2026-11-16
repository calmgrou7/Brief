"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PhoneVerify from "./PhoneVerify";
import { api, getAnonId, getChannel, getUtm, track } from "@/lib/client";
import { consentItems, type ConsentKey } from "@/lib/consent";

const INTERESTS = [
  { value: "claim", label: "놓친 보험금 청구" },
  { value: "check", label: "내 보험 보장 점검" },
  { value: "remodel", label: "보험료 줄이기 (리모델링)" },
  { value: "new", label: "새 보험 알아보기" },
  { value: "etc", label: "기타 문의" },
];

export default function LeadForm({ diagnosisId, defaultInterest = "check", cta = "무료 상담 신청하기" }: {
  diagnosisId?: string; defaultInterest?: string; cta?: string;
}) {
  const router = useRouter();
  const items = useMemo(() => consentItems({ withDiagnosis: !!diagnosisId }), [diagnosisId]);
  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [interest, setInterest] = useState(defaultInterest);
  const [message, setMessage] = useState("");
  const [verified, setVerified] = useState<{ phone: string; proof: string } | null>(null);
  const [consents, setConsents] = useState<Partial<Record<ConsentKey, boolean>>>({});
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { track("lead_form_view", { diagnosisId: !!diagnosisId }); }, [diagnosisId]);

  const allOn = items.every((i) => consents[i.key]);
  const requiredOk = items.filter((i) => i.required).every((i) => consents[i.key]);
  const canSubmit = !!name.trim() && !!verified && requiredOk && !busy;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verified) return;
    setErr(""); setBusy(true);
    try {
      await api("/api/leads", {
        name, phone: verified.phone, verifiedProof: verified.proof, birthYear, interest, message,
        consents, diagnosisId, anonId: getAnonId(), channel: getChannel(), utm: getUtm(), wantsConsult: true,
      });
      track("lead_submit", { interest });
      router.push(diagnosisId ? `/check/result?id=${diagnosisId}&unlocked=1` : "/done");
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  };

  return (
    <form onSubmit={submit}>
      <label className="field">이름
        <input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" />
      </label>
      <PhoneVerify onVerified={(phone, proof) => setVerified({ phone, proof })} />
      <label className="field">출생연도 (선택)
        <input inputMode="numeric" maxLength={4} placeholder="1988" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} />
      </label>
      <label className="field">상담 받고 싶은 내용
        <select value={interest} onChange={(e) => setInterest(e.target.value)}>
          {INTERESTS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
        </select>
      </label>
      <label className="field">남기실 말씀 (선택)
        <textarea rows={2} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="예) 작년에 용종 제거했는데 수술비 받을 수 있나요?" />
      </label>

      <div className="consent">
        <label>
          <input type="checkbox" checked={allOn} onChange={(e) => setConsents(Object.fromEntries(items.map((i) => [i.key, e.target.checked])))} />
          <b>전체 동의</b>
        </label>
        {items.map((it) => (
          <div key={it.key}>
            <label>
              <input type="checkbox" checked={!!consents[it.key]} onChange={(e) => setConsents({ ...consents, [it.key]: e.target.checked })} />
              {it.label}
            </label>
            <details><summary>내용 보기</summary>{it.body}</details>
          </div>
        ))}
      </div>

      {err && <p className="err">{err}</p>}
      <button className="btn btn-primary" disabled={!canSubmit}>{busy ? "접수 중..." : cta}</button>
      <p className="small" style={{ marginTop: 8 }}>상담은 무료이며, 원하지 않으면 언제든 연락 중단을 요청할 수 있어요.</p>
    </form>
  );
}
