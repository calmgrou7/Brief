import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CLAIM_GUIDES, getGuide } from "@/lib/claims";

export function generateStaticParams() {
  return CLAIM_GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const g = getGuide((await params).slug);
  return g ? { title: `${g.title} 방법과 필요 서류`, description: g.summary } : {};
}

export default async function ClaimDetail({ params }: { params: Promise<{ slug: string }> }) {
  const g = getGuide((await params).slug);
  if (!g) notFound();
  return (
    <main>
      <Link href="/claim" className="small">← 청구 가이드</Link>
      <h1>{g.title}</h1>
      <p className="muted">{g.summary}</p>
      <div className="card"><h3>필요 서류</h3><ul>{g.docs.map((d) => <li key={d}>{d}</li>)}</ul></div>
      <div className="card"><h3>청구 절차</h3><ol>{g.steps.map((s) => <li key={s}>{s}</li>)}</ol></div>
      <div className="card"><h3>꼭 알아두세요</h3><ul>{g.tips.map((t) => <li key={t}>{t}</li>)}</ul></div>
      <h2>내가 받을 수 있는지 궁금하다면</h2>
      <div className="grid">
        <Link href="/check" className="btn btn-primary">30초 점검으로 확인하기</Link>
        <Link href={`/consult?interest=claim&from=guide-${g.slug}`} className="btn btn-ghost">전문가 무료 상담 신청</Link>
      </div>
    </main>
  );
}
