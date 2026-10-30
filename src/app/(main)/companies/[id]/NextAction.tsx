'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { saveNextAction, type FormState } from '../../../actions';
import { addDays, dueText, fmtDate, weekday } from '@/lib/derive';
import { keepForm } from '../../../ui/useKeepForm';
import { DoneButton } from '../../../ui/DoneButton';
import { Icon } from '../../../ui/icons';

/** 업체의 다음 액션 = 할 일·일정의 원본. 여기서 완료·변경한다 */
export function NextAction({ companyId, text, date, today, autoOpen }: { companyId: string; text: string; date: string; today: string; autoOpen: boolean }) {
  const [editing, setEditing] = useState(autoOpen);
  const [state, action, pending] = useActionState<FormState, FormData>(saveNextAction, {});
  const [due, setDue] = useState(date.slice(0, 10));
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onReg = (e: Event) => { if ((e as CustomEvent).detail === 'next') { setEditing(true); box.current?.scrollIntoView({ block: 'center' }); } };
    window.addEventListener('chaeum:register', onReg);
    return () => window.removeEventListener('chaeum:register', onReg);
  }, []);
  useEffect(() => { if (state.ok) setEditing(false); }, [state]);
  useEffect(() => {
    if (!autoOpen) return;
    box.current?.scrollIntoView({ block: 'center' });
    const u = new URL(window.location.href); u.searchParams.delete('next'); window.history.replaceState(null, '', u);
  }, [autoOpen]);

  const over = Boolean(date) && date.slice(0, 10) < today;

  if (editing) {
    return (
      <div ref={box} className="card">
        <form action={action} onSubmit={keepForm(action)} className="form" style={{ gap: 12 }}>
          <input type="hidden" name="companyId" value={companyId} />
          <label className="field"><span>다음에 할 일<em>*</em></span>
            <input name="nextAction" defaultValue={text} placeholder="예) 신청서류 체크리스트 송부" required autoFocus />
          </label>
          <label className="field"><span>날짜 (일정에 표시)</span>
            <input type="date" name="nextActionDate" value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
          <div className="date-quick" role="group" aria-label="빠른 날짜">
            {[[1, '내일'], [3, '3일 뒤'], [7, '1주 뒤'], [14, '2주 뒤']].map(([n, l]) => (
              <button key={n} type="button" className="chip" aria-pressed={due === addDays(today, Number(n))} onClick={() => setDue(addDays(today, Number(n)))}>{l}</button>
            ))}
          </div>
          {state.error && <p className="notice err" role="alert" style={{ margin: 0 }}>{state.error}</p>}
          <div className="row">
            <button className="btn primary" disabled={pending}>{pending ? '저장 중…' : '저장'}</button>
            <button type="button" className="btn" onClick={() => setEditing(false)}>취소</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div ref={box} className={`next-card${over ? ' over' : ''}`}>
      <div>
        <div className="lbl">{over ? '다음 액션 · 지난 일' : '다음 액션'}</div>
        <div className="txt">{text || '정해진 다음 액션이 없습니다'}</div>
        {date && <div className="when">{fmtDate(date)} ({weekday(date)}) · {dueText(date, today)}</div>}
        {state.ok && <div className="when" role="status">{state.ok}</div>}
      </div>
      <div className="row">
        {text && <DoneButton kind="action" companyId={companyId} title={text} />}
        <button type="button" className="btn sm" onClick={() => setEditing(true)}><Icon name="edit" />{text ? '변경' : '정하기'}</button>
      </div>
    </div>
  );
}
