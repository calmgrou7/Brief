"use client";
import { useState } from "react";
import { api, track } from "@/lib/client";

/** 휴대폰 인증 (문자 인증번호). 완료되면 onVerified(phone, proof) 호출 */
export default function PhoneVerify({ onVerified }: { onVerified: (phone: string, proof: string) => void }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [devCode, setDevCode] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setErr(""); setBusy(true);
    try {
      const r = await api<{ token: string; devCode?: string }>("/api/otp/send", { phone });
      setToken(r.token); setDevCode(r.devCode || ""); track("otp_sent");
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const verify = async () => {
    setErr(""); setBusy(true);
    try {
      const r = await api<{ proof: string }>("/api/otp/verify", { phone, code, token });
      setDone(true); onVerified(phone.replace(/[^0-9]/g, ""), r.proof);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="row">
        <label className="field">휴대폰 번호
          <input inputMode="numeric" autoComplete="tel" placeholder="01012345678" value={phone} disabled={done}
            onChange={(e) => setPhone(e.target.value)} />
        </label>
        {!done && (
          <button type="button" className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }} disabled={busy || phone.length < 10} onClick={send}>
            {token ? "재전송" : "인증번호 받기"}
          </button>
        )}
      </div>
      {token && !done && (
        <div className="row">
          <label className="field">인증번호 6자리
            <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
          </label>
          <button type="button" className="btn btn-primary btn-sm" style={{ marginBottom: 12 }} disabled={busy || code.length !== 6} onClick={verify}>확인</button>
        </div>
      )}
      {devCode && !done && <p className="small">개발 모드 인증번호: <b>{devCode}</b></p>}
      {done && <p className="ok">✓ 휴대폰 인증 완료</p>}
      {err && <p className="err">{err}</p>}
    </div>
  );
}
