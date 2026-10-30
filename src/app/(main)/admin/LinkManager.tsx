'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { removeDashLink, saveDashLink, type FormState } from '../../actions';
import { keepForm } from '../../ui/useKeepForm';
import type { DashLink } from '@/lib/schema';

export function LinkManager({ links }: { links: DashLink[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <div className="stack" style={{ gap: 12 }}>
      {links.length > 0 && (
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>순서</th><th>이름</th><th>주소</th><th>설명</th><th></th></tr></thead>
            <tbody>
              {links.map((l) => editing === l.id ? (
                <tr key={l.id}><td colSpan={5} style={{ whiteSpace: 'normal' }}><LinkForm link={l} onDone={() => setEditing(null)} /></td></tr>
              ) : (
                <tr key={l.id}>
                  <td>{l.order ?? '—'}</td><td>{l.name}</td>
                  <td><a href={l.href} target="_blank" rel="noreferrer">{l.href}</a></td>
                  <td className="wrap">{l.desc || '—'}</td>
                  <td>
                    <div className="row" style={{ flexWrap: 'nowrap' }}>
                      <button type="button" className="btn sm" onClick={() => setEditing(l.id)}>수정</button>
                      <form action={removeDashLink} onSubmit={(e) => { if (!confirm(`‘${l.name}’ 링크를 삭제할까요?`)) e.preventDefault(); }}>
                        <input type="hidden" name="id" value={l.id} />
                        <button className="btn sm danger">삭제</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing === null && <LinkForm key={links.length} />}
    </div>
  );
}

function LinkForm({ link, onDone }: { link?: DashLink; onDone?: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveDashLink, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state.ok) return;
    if (onDone) onDone();
    else ref.current?.reset();
  }, [state, onDone]);
  return (
    <form ref={ref} action={action} onSubmit={keepForm(action)} className="form" style={{ gap: 12 }}>
      {link && <input type="hidden" name="id" value={link.id} />}
      <div className="fields">
        <label className="field"><span>이름</span><input name="name" defaultValue={link?.name} placeholder="예) 위들리 대시보드" required /></label>
        <label className="field"><span>주소</span><input type="url" name="href" defaultValue={link?.href} placeholder="https://" required /></label>
        <label className="field"><span>설명</span><input name="desc" defaultValue={link?.desc} /></label>
        <label className="field"><span>순서</span><input name="order" inputMode="numeric" defaultValue={link?.order ?? ''} /></label>
        <label className="check-line full"><input type="checkbox" name="newTab" defaultChecked={link?.newTab ?? true} />새 탭으로 열기</label>
      </div>
      {state.error && <p className="notice err" role="alert">{state.error}</p>}
      {state.ok && !link && <p className="notice ok" role="status">{state.ok}</p>}
      <div className="row">
        <button className="btn primary sm" disabled={pending}>{pending ? '저장 중…' : link ? '저장' : '+ 링크 추가'}</button>
        {onDone && <button type="button" className="btn sm" onClick={onDone}>취소</button>}
      </div>
    </form>
  );
}
