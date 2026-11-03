'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { saveWork, type FormState } from '../../../actions';
import { addDays } from '@/lib/derive';
import { WORK_AREAS } from '@/lib/schema';
import { keepForm } from '../../../ui/useKeepForm';
import { Icon } from '../../../ui/icons';

/** 업체 업무 추가: 노션 '채움파트너스 기업 컨설팅 · 업무 관리'에 행으로 저장 */
export function WorkPanel({ companyId, companyName, today, autoOpen, children }: {
  companyId: string; companyName: string; today: string; autoOpen: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(autoOpen);
  const [due, setDue] = useState(today);
  const [state, action, pending] = useActionState<FormState, FormData>(saveWork, {});
  const formRef = useRef<HTMLFormElement>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onReg = (e: Event) => {
      if ((e as CustomEvent).detail !== 'work') return;
      setOpen(true);
      document.getElementById('tab-works')?.click();
      setTimeout(() => box.current?.scrollIntoView({ block: 'center' }), 50);
    };
    window.addEventListener('chaeum:register', onReg);
    return () => window.removeEventListener('chaeum:register', onReg);
  }, []);
  useEffect(() => {
    if (!autoOpen) return;
    document.getElementById('tab-works')?.click();
    const u = new URL(window.location.href); u.searchParams.delete('work'); window.history.replaceState(null, '', u);
  }, [autoOpen]);
  useEffect(() => {
    if (!state.ok) return;
    formRef.current?.reset();
    setDue(today);
    setOpen(false);
  }, [state, today]);

  return (
    <section className="card stack" ref={box}>
      <div className="card-head" style={{ marginBottom: 0 }}>
        <h2>업무</h2>
        {!open && <button type="button" className="btn sm primary" onClick={() => setOpen(true)}><Icon name="plus" />업무 추가</button>}
      </div>
      {state.ok && !open && <p className="notice ok" role="status" style={{ margin: 0 }}>{state.ok}</p>}
      {open && (
        <form ref={formRef} action={action} onSubmit={keepForm(action)} className="form" style={{ gap: 12, padding: 14, borderRadius: 12, background: 'var(--surface-2)' }}>
          <input type="hidden" name="companyId" value={companyId} />
          <label className="field"><span>업무명<em>*</em></span>
            <input name="title" placeholder="예) 벤처인증 신청서류 접수" required autoFocus />
          </label>
          <div className="fields">
            <label className="field"><span>기한</span>
              <input type="date" name="due" value={due} onChange={(e) => setDue(e.target.value)} />
            </label>
            <label className="field"><span>분야</span>
              <select name="area" defaultValue="">
                <option value="">선택 안 함</option>
                {WORK_AREAS.map((a) => <option key={a}>{a}</option>)}
              </select>
            </label>
          </div>
          <div className="date-quick" role="group" aria-label="빠른 기한">
            {[[0, '오늘'], [1, '내일'], [7, '1주 뒤'], [30, '한 달 뒤']].map(([n, l]) => (
              <button key={n} type="button" className="chip" aria-pressed={due === addDays(today, Number(n))} onClick={() => setDue(addDays(today, Number(n)))}>{l}</button>
            ))}
          </div>
          <label className="field"><span>실행 메모</span><input name="memo" placeholder="필요한 서류, 담당자 등" /></label>
          {state.error && <p className="notice err" role="alert" style={{ margin: 0 }}>{state.error}</p>}
          <p className="hint">노션 ‘채움파트너스 기업 컨설팅 · 업무 관리’에 업체·기관 ‘{companyName}’으로 저장됩니다.</p>
          <div className="row">
            <button className="btn primary" disabled={pending}>{pending ? '저장 중…' : '업무 저장'}</button>
            <button type="button" className="btn" onClick={() => setOpen(false)}>취소</button>
          </div>
        </form>
      )}
      {children}
    </section>
  );
}
