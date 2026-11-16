import Link from "next/link";
import type { Metadata } from "next";
import { CLAIM_GUIDES } from "@/lib/claims";

export const metadata: Metadata = { title: "보험금 청구 가이드", description: "통원·입원·수술·골절·치과·교통사고 보험금 청구 서류와 절차를 한 번에 정리했어요." };

export default function ClaimList() {
  return (
    <main>
      <h1>보험금 청구 가이드</h1>
      <p className="muted">상황별로 필요한 서류와 절차를 정리했어요. 진료일로부터 3년 이내라면 지금도 청구할 수 있어요.</p>
      <div className="grid" style={{ marginTop: 16 }}>
        {CLAIM_GUIDES.map((g) => (
          <Link key={g.slug} href={`/claim/${g.slug}`} className="card link">
            <h3>{g.title}</h3>
            <p className="muted">{g.summary}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
