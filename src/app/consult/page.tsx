"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import LeadForm from "@/components/LeadForm";

function Consult() {
  const sp = useSearchParams();
  return (
    <main>
      <h1>전문가 무료 상담</h1>
      <p className="muted">놓친 보험금 청구, 보장 점검, 보험료 절감까지. 남겨주시면 영업일 24시간 안에 연락드려요.</p>
      <div className="card" style={{ marginTop: 16 }}>
        <LeadForm defaultInterest={sp.get("interest") || "check"} />
      </div>
    </main>
  );
}
export default function ConsultPage() {
  return <Suspense><Consult /></Suspense>;
}
