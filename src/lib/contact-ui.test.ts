// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
vi.mock('../app/actions', () => ({ saveNextAction: vi.fn(), completeTask: vi.fn(), logContact: vi.fn(), retryContactSummary: vi.fn() }));
import { NextAction } from '../app/(main)/companies/[id]/NextAction';
import { QuickContact } from '../app/(main)/companies/[id]/QuickContact';
import { logContact, retryContactSummary, saveNextAction } from '../app/actions';
let node: HTMLDivElement; let root: Root;
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  HTMLElement.prototype.scrollIntoView = vi.fn();
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
  node = document.createElement('div'); document.body.append(node); root = createRoot(node);
});
afterEach(async () => { await act(async () => root.unmount()); node.remove(); vi.unstubAllGlobals(); });
const click = async (text: string) => {
  const button = [...node.querySelectorAll('button')].find(b => b.textContent === text)!;
  expect(button).toBeTruthy(); await act(async () => button.click());
};
const due = () => (node.querySelector('[name=nextActionDate]') as HTMLInputElement).value;
const props = { companyId: 'c1', text: 'old task', date: '2026-10-31', today: '2026-10-31', autoOpen: true };
it('discards cancelled dates and clears completed dates before creating a new action', async () => {
  await act(async () => root.render(React.createElement(NextAction, props)));
  await click('내일'); await click('취소'); await click('변경');
  expect(due()).toBe('2026-10-31');
  await click('취소');
  await act(async () => root.render(React.createElement(NextAction, { ...props, text: '', date: '', autoOpen: false })));
  await click('정하기'); expect(due()).toBe('');
});
it('uses refreshed dates and register-event editing; keeps pending edits on validation errors', async () => {
  await act(async () => root.render(React.createElement(NextAction, { ...props, autoOpen: false })));
  await act(async () => root.render(React.createElement(NextAction, { ...props, date: '2026-11-04', autoOpen: false })));
  await act(async () => window.dispatchEvent(new CustomEvent('chaeum:register', { detail: 'next' })));
  expect(due()).toBe('2026-11-04');
  await click('내일');
  vi.mocked(saveNextAction).mockResolvedValue({ error: 'temporary failure' });
  await act(async () => node.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(due()).toBe('2026-11-01'); expect(node.textContent).toContain('temporary failure');
});
it('closes a committed contact form, shows persistent partial-save warning, and retries summary only', async () => {
  vi.mocked(logContact).mockResolvedValue({ ok: 'saved contact', warning: 'summary failed; contact and follow-up saved' });
  vi.mocked(retryContactSummary).mockResolvedValue({ ok: 'summary synced' });
  await act(async () => root.render(React.createElement(QuickContact, { companyId: 'c1', companyName: 'test', now: '2026-10-31T12:00', autoOpen: false })));
  await click('기록');
  await act(async () => node.querySelector('dialog form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(node.querySelector('dialog')!.open).toBe(false);
  expect(node.textContent).toContain('summary failed');
  await click('최근 접촉 정보만 재시도');
  expect(logContact).toHaveBeenCalledOnce(); expect(retryContactSummary).toHaveBeenCalledOnce();
  expect(node.textContent).toContain('summary synced');
});
