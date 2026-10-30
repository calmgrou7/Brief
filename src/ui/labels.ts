// 진단 기준(가결산/확정 결산)과 사업자 구분(법인/개인)에 따라 바뀌는 화면 문구
export function periodLabels(final: boolean, individual = false) {
  return {
    kind: final ? '결산' : '가결산', // 리포트 이름 등
    current: final ? '당기 결산' : '연말 예상',
    ytd: final ? '당기 결산' : '가결산 누적',
    currentCol: final ? '당기 (결산)' : '당기 (가결산)',
    tax: individual ? '종합소득세(추정, 참고)' : final ? '법인세(신고)' : '법인세(추정)',
  };
}
