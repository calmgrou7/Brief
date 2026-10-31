import { expect, it } from 'vitest';
import { demoDataset } from './demo';
import { calendarEvents, companyRows, dayKST, daysBetween, fmtDate, homeStats, sortRows } from './derive';
it('formats equivalent UTC, offset and timezone-less KST timestamps identically', () => {
  for (const value of ['2026-10-31T16:00:00Z', '2026-11-01T01:00:00+09:00', '2026-11-01T01:00:00']) {
    expect(fmtDate(value)).toBe('2026.11.01 01:00');
    expect(dayKST(value)).toBe('2026-11-01');
    expect(daysBetween(value, '2026-11-01')).toBe(0);
  }
  expect(fmtDate('2026-10-31')).toBe('2026.10.31');
  expect(dayKST('')).toBe('');
});
it('buckets contact counts and calendar timestamps by KST day without shifting date-only values', () => {
  const d = demoDataset();
  d.contacts = [{ ...d.contacts[0], companyIds: [d.companies[0].id], date: '2026-10-31T16:00:00Z', followUp: 'call', followUpDue: '2026-10-31T16:00:00Z' }];
  expect(homeStats(d, '2026-11-01').contactsThisMonth).toBe(1);
  expect(calendarEvents(d).find(e => e.key === `f-${d.contacts[0].id}`)?.date).toBe('2026-11-01');
  d.contacts[0].followUpDue = '2026-10-31';
  expect(calendarEvents(d).find(e => e.key === `f-${d.contacts[0].id}`)?.date).toBe('2026-10-31');
});
it('sorts recent and stale by instant across timezones, retaining empty-date ordering', () => {
  const d = demoDataset(); d.contacts = [];
  d.companies = [
    { ...d.companies[0], id: 'newer', lastContactDate: '2026-10-31T16:00:00Z' },
    { ...d.companies[0], id: 'older', lastContactDate: '2026-11-01T00:00:00+09:00' },
    { ...d.companies[0], id: 'empty', lastContactDate: '' },
  ];
  const rows = companyRows(d, '2026-11-01');
  expect(sortRows(rows, 'recent').map(c => c.id)).toEqual(['newer', 'older', 'empty']);
  expect(sortRows(rows, 'stale').map(c => c.id)).toEqual(['empty', 'older', 'newer']);
});
