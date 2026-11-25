-- 재무보고를 기금(본회/봉사기금)별로 분리: 같은 달도 기금마다 1건
alter table public.jw_finance add column if not exists fund text not null default '본회' check (fund in ('본회','봉사기금'));
alter table public.jw_finance drop constraint if exists jw_finance_period_key;
create unique index if not exists jw_finance_period_fund_uq on public.jw_finance (period, fund);
