/**
 * 동의 항목 정의. 문구는 초안이며 반드시 법률 검토 후 확정하세요.
 * version을 올리면 이후 수집분부터 새 버전으로 기록됩니다(감사 대응).
 */
import { config } from "./config";

export const CONSENT_VERSION = "2026-11-v1";

export type ConsentKey = "privacy_required" | "sensitive" | "marketing" | "third_party";

export type ConsentItem = {
  key: ConsentKey;
  label: string;
  required: boolean;
  body: string;
};

export function consentItems(opts: { withDiagnosis: boolean }): ConsentItem[] {
  const items: ConsentItem[] = [
    {
      key: "privacy_required",
      required: true,
      label: "[필수] 개인정보 수집·이용 동의",
      body: `수집 항목: 이름, 휴대폰번호, 출생연도, 상담 희망 내용\n이용 목적: 보험 점검 결과 안내 및 상담 연락\n보유 기간: 동의 철회 또는 수집일로부터 1년 (관계 법령에 따른 보존 기간이 있는 경우 그 기간)\n수집·이용 주체: ${config.operatorName}\n동의를 거부할 수 있으나, 거부 시 상담 서비스를 이용할 수 없습니다.`,
    },
  ];
  if (opts.withDiagnosis)
    items.push({
      key: "sensitive",
      required: true,
      label: "[필수] 민감정보(건강 관련 응답) 처리 동의",
      body: "처리 항목: 점검 문항 중 병원 이용·입원·수술 여부 응답\n이용 목적: 청구 가능 보험금 및 보장 공백 안내\n보유 기간: 동의 철회 또는 수집일로부터 1년\n동의를 거부할 수 있으며, 거부 시 점검 결과 연계 상담이 제한됩니다.",
    });
  items.push({
    key: "marketing",
    required: false,
    label: "[선택] 혜택·정보 알림 수신 동의 (문자·카카오톡)",
    body: "보험 정보, 청구 기한 알림, 이벤트 안내를 문자·알림톡으로 받습니다. 언제든 수신 거부할 수 있습니다.",
  });
  if (config.thirdPartyRecipients)
    items.push({
      key: "third_party",
      required: false,
      label: "[선택] 개인정보 제3자 제공 동의",
      body: `제공받는 자: ${config.thirdPartyRecipients}\n제공 항목: 이름, 휴대폰번호, 출생연도, 상담 희망 내용, 점검 결과 요약\n이용 목적: 보험 상담 및 보장 분석\n보유 기간: 제공 목적 달성 또는 동의 철회 시까지 (최대 1년)\n동의를 거부해도 기본 상담은 이용할 수 있습니다.`,
    });
  return items;
}
