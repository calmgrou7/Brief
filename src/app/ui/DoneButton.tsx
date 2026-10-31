'use client';

import { useActionState } from 'react';
import { completeTask, type FormState } from '../actions';
import { Icon } from './icons';

/** 할 일 완료. 저장이 실패하면 성공처럼 보이지 않도록 오류를 그 자리에 표시한다 */
export function DoneButton({ kind, companyId, contactId, title }: { kind: 'action' | 'followup'; companyId: string; contactId?: string; title: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(completeTask, {});
  return (
    <form action={action} style={{ display: 'contents' }}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="companyId" value={companyId} />
      {contactId && <input type="hidden" name="contactId" value={contactId} />}
      <button className="btn sm" disabled={pending} aria-label={`${title} 완료`}>
        <Icon name="check" />{pending ? '저장 중' : '완료'}
      </button>
      {state.error && <span className="task-err" role="alert">{state.error}</span>}
    </form>
  );
}
