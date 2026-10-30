-- 월말 정산: 고객별 비용 기록과 청구서 상태
-- decision_records와 마찬가지로 앱 서버만 접근 (RLS 켜고 정책 없음)

create table if not exists expenses (
  id          text primary key,
  client_id   text not null,
  month       text not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  category    text not null check (category in ('creative', 'tool', 'other')),
  amount      bigint not null check (amount > 0),
  memo        text not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists expenses_month_idx on expenses (month);

create table if not exists invoice_status (
  client_id   text not null,
  month       text not null,
  status      text not null check (status in ('draft', 'sent', 'paid')),
  updated_at  timestamptz not null default now(),
  primary key (client_id, month)
);

alter table expenses enable row level security;
alter table invoice_status enable row level security;
