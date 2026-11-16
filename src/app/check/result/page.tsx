"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import LeadForm from "@/components/LeadForm";
import { api, track } from "@/lib/client";
import type { Finding } from "@/lib/diagnosis";

const KIND = { claim: "숨은 보험금", gap: "보장 공백", cost: "보험료", check: "확인 필요" } as const;

function Result() {
  const sp = useSearchParams();
  const id = sp.get("id") || "";
  const unlocked = sp.get("unlocked") === "1";
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!id) return;
    api<{ findings: Finding[] }>(`/api/diagnosis/${id}`).then((r) => { setFindings(r.findings); track("result_view", { n: r.findings.length }); }).catch((e) => setErr(e.message));
  }, [id]);

  if (err) return <p className="err">{err}</p>;
  if (!findings) return <p className="muted">결과를 불러오는 중...</p>;

  const claims = findings.filter((f) => f.kind === "claim").length;
  const gaps = findings.filter((f) => f.kind === "gap").length;
  const FREE = 1; // 무료로 상세 공개하는 항목 수

  return (
    <main>
      <h1>{findings.length ? <>점검 결과,<br />확인할 항목이 {findings.length}개 있어요</> : "현재 응답 기준으로 큰 문제는 없어 보여요"}</h1>
      <div className="stat" style={{ margin: "16px 0" }}>
        <div><b>{claims}</b><span className="small">숨은 보험금 가능성</span></div>
        <div><b>{gaps}</b><span className="small">보장 공백</span></div>
      </div>

      {findings.map((f, i) => (
        <div className="card" key={i}>
          <span className={`badge b-${f.kind}`}>{KIND[f.kind]}</span>
          <h3 style={{ marginTop: 8 }}>{f.title}</h3>
          <div className={!unlocked && i >= FREE ? "locked" : ""}>
            <p className="muted">{f.detail}</p>
            {f.claimSlug && <Link href={`/claim/${f.claimSlug}`} className="small" style={{ textDecoration: "underline" }}>청구 방법 보기 →</Link>}
          </div>
        </div>
      ))}

      {unlocked ? (
        <div className="card" style={{ borderColor: "var(--accent)" }}>
          <h3>✓ 상담 신청이 접수됐어요</h3>
          <p className="muted">영업일 기준 24시간 안에 전문가가 연락드려요. 그 전에 궁금한 건 AI에게 물어보세요.</p>
          <Link href="/ask" className="btn btn-ghost" style={{ marginTop: 10 }}>AI에게 바로 물어보기</Link>
        </div>
      ) : (
        <>
          <h2>{findings.length > FREE ? "전체 결과 + 전문가 확인 받기" : "전문가에게 한 번 더 확인받기"}</h2>
          <p className="muted">실제로 받을 수 있는 금액은 가입한 특약에 따라 달라요. 전문가가 증권을 보고 정확히 알려드려요.</p>
          <LeadForm diagnosisId={id} defaultInterest={claims ? "claim" : "check"} cta="전체 결과 보고 무료 상담 받기" />
        </>
      )}
      <p className="small" style={{ marginTop: 16 }}>※ 점검 결과는 응답을 바탕으로 한 가능성 안내이며, 실제 보장·지급 여부는 보험사 약관과 심사에 따릅니다.</p>
    </main>
  );
}

export default function ResultPage() {
  return <Suspense fallback={<p className="muted">불러오는 중...</p>}><Result /></Suspense>;
}
