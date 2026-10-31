'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { logContact, type FormState } from '../../../actions';
import { keepForm } from '../../../ui/useKeepForm';
import { METHODS } from '@/lib/schema';
import { nowKST } from '@/lib/derive';
import { Icon, METHOD_ICON } from '../../../ui/icons';

/** 방문·통화 직후 3초 기록: 방법 고르고 한 줄 쓰고 저장 */
export function QuickContact({ companyId, companyName, now, autoOpen }: { companyId: string; companyName: string; now: string; autoOpen: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<FormState, FormData>(logContact, {});
  const [stamp, setStamp] = useState(now);

  const open = () => {
    // 서버는 이 값을 한국 시간(+09:00)으로 저장하므로 기기 시간대와 관계없이 한국 시간으로 채운다
    setStamp(nowKST());
    ref.current?.showModal();
  };
  useEffect(() => {
    if (!autoOpen) return;
    open();
    // 닫은 뒤 새로고침해도 다시 열리지 않도록 주소에서 뺀다
    const u = new URL(window.location.href); u.searchParams.delete('log'); window.history.replaceState(null, '', u);
  }, [autoOpen]);
  useEffect(() => {
    const onReg = (e: Event) => { if ((e as CustomEvent).detail === 'contact') open(); };
    window.addEventListener('chaeum:register', onReg);
    return () => window.removeEventListener('chaeum:register', onReg);
  }, []);
  const [toast, setToast] = useState('');
  useEffect(() => {
    if (!state.ok) return;
    formRef.current?.reset();
    ref.current?.close();
    setToast(state.ok);
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [state]);

  return (
    <>
      <button type="button" className="btn primary" onClick={open}><Icon name="note" />기록</button>
      {toast && <p className="toast" role="status">{toast}</p>}
      <dialog ref={ref} className="sheet" aria-labelledby="qc-title">
        <form ref={formRef} action={action} onSubmit={keepForm(action)} className="sheet-in">
          <div className="sheet-head">
            <h2 id="qc-title">접촉 기록 · {companyName}</h2>
            <button type="button" className="btn ghost sm" onClick={() => ref.current?.close()} aria-label="닫기"><Icon name="close" /></button>
          </div>
          <input type="hidden" name="companyId" value={companyId} />
          <div className="seg" role="radiogroup" aria-label="방법">
            {METHODS.map((m, i) => (
              <label key={m}>
                <input type="radio" name="method" value={m} defaultChecked={i === 0} />
                <span><Icon name={METHOD_ICON[m]} />{m}</span>
              </label>
            ))}
          </div>
          <label className="field">
            <span>무엇을 했나요</span>
            <textarea name="content" rows={3} placeholder="예) 이노비즈 요건 설명, 대표님이 설비자금에 관심" required />
          </label>
          <label className="field">
            <span>일시</span>
            <input type="datetime-local" name="date" value={stamp} onChange={(e) => setStamp(e.target.value)} required />
          </label>
          <details className="more">
            <summary>후속조치·관심사 추가 입력</summary>
            <div className="fields">
              <label className="field full"><span>후속조치</span><input name="followUp" placeholder="예) 신청서류 체크리스트 송부" /></label>
              <label className="field"><span>후속기한</span><input type="date" name="followUpDue" /></label>
              <label className="field"><span>방향</span>
                <select name="direction" defaultValue="발신"><option>발신</option><option>수신</option></select>
              </label>
              <label className="field"><span>상대</span><input name="counterpart" placeholder="대표, 실무자 등" /></label>
              <label className="field"><span>감지한 관심사</span><input name="detectedInterest" placeholder="예) 설비투자 자금" /></label>
            </div>
          </details>
          {state.error && <p className="notice err" role="alert">{state.error}</p>}
          <button className="btn primary" disabled={pending}>{pending ? '저장 중…' : '저장'}</button>
        </form>
      </dialog>
    </>
  );
}
