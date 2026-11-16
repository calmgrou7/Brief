"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, getAnonId, getChannel, track } from "@/lib/client";

type Msg = { role: "user" | "assistant"; content: string; consult?: boolean };
const SAMPLES = ["내시경 용종 제거하면 수술비 받을 수 있나요?", "3년 전 병원비도 청구되나요?", "실손 청구할 때 필요한 서류는?", "보험료가 너무 비싼데 해지해도 될까요?"];

export default function AskPage() {
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", content: "안녕하세요! 보험금 청구, 보장 내용, 보험료까지 무엇이든 물어보세요.\n이름·전화번호 같은 개인정보는 적지 말아주세요." }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const sessionId = useRef<string>("");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { sessionId.current = crypto.randomUUID(); track("chat_open"); }, []);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const next = [...msgs, { role: "user" as const, content: q }];
    setMsgs(next); setInput(""); setBusy(true);
    try {
      const history = next.slice(1).map(({ role, content }) => ({ role, content }));
      const r = await api<{ answer: string; suggestConsult: boolean }>("/api/chat", { history, anonId: getAnonId(), channel: getChannel(), sessionId: sessionId.current });
      setMsgs([...next, { role: "assistant", content: r.answer, consult: r.suggestConsult }]);
    } catch (e) {
      setMsgs([...next, { role: "assistant", content: (e as Error).message }]);
    } finally { setBusy(false); }
  };

  return (
    <main>
      <h1 style={{ fontSize: 22 }}>AI 보험 상담</h1>
      <div className="chat">
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "contents" }}>
            <div className={`bubble ${m.role === "user" ? "user" : "bot"}`}>{m.content}</div>
            {m.consult && (
              <Link href="/consult?from=chat" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => track("consult_click", { from: "chat" })}>
                🙋 전문가에게 무료로 확인받기
              </Link>
            )}
          </div>
        ))}
        {msgs.length === 1 && (
          <div className="chips">{SAMPLES.map((s) => <button key={s} className="chip" onClick={() => send(s)}>{s}</button>)}</div>
        )}
        {busy && <div className="bubble bot">답변을 작성하고 있어요...</div>}
        <div ref={end} />
      </div>
      <div className="composer">
        <form onSubmit={(e) => { e.preventDefault(); send(input); }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="보험에 대해 물어보세요" maxLength={1000} />
          <button className="btn btn-primary" disabled={busy || !input.trim()}>전송</button>
        </form>
      </div>
    </main>
  );
}
