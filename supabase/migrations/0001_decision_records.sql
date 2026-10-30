-- 오늘의 결정함 처리 기록 (승인·보류·무시)
-- 앱 서버만 DB 연결 문자열로 접근한다. 공개 API(anon 키)로는 읽을 수 없도록 RLS를 켜고 정책을 두지 않는다.

create table if not exists decision_records (
  id            text primary key,              -- 결정 ID (예: pause_ad:haru:haru-ad3)
  status        text not null check (status in ('approved', 'snoozed', 'dismissed')),
  at            timestamptz not null default now(),
  until         date,                          -- 보류는 이 날짜(포함)까지 숨김
  title         text not null default '',
  client_name   text not null default '',
  impact_label  text not null default ''
);

alter table decision_records enable row level security;
