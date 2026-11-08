-- 환불 중복 실행 방지용 상태 추가 (enum 값 추가는 별도 마이그레이션으로 분리해야 같은 트랜잭션에서 안전)
alter type payment_status add value if not exists 'refund_processing' after 'refund_requested';
