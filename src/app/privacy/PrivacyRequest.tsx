"use client";
import { useState } from "react";
import PhoneVerify from "@/components/PhoneVerify";
import { api } from "@/lib/client";

export default function PrivacyRequest() {
  const [v, setV] = useState<{ phone: string; proof: string } | null>(null);
  const [type, setType] = useState("delete");
  const [msg, setMsg] = useState("");
  const submit = async () => {
    if (!v) return;
    try { await api("/api/privacy", { phone: v.phone, verifiedProof: v.proof, type }); setMsg("요청이 접수됐어요. 10일 이내 처리 후 문자로 알려드려요."); }
    catch (e) { setMsg((e as Error).message); }
  };
  return (
    <div className="card">
      <PhoneVerify onVerified={(phone, proof) => setV({ phone, proof })} />
      <label className="field">요청 종류
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="delete">내 개인정보 전체 삭제</option>
          <option value="withdraw_marketing">광고·알림 수신 거부</option>
        </select>
      </label>
      <button className="btn btn-primary" disabled={!v} onClick={submit}>요청하기</button>
      {msg && <p className="muted" style={{ marginTop: 8 }}>{msg}</p>}
    </div>
  );
}
