'use client';

import { useActionState } from 'react';
import { login, type FormState } from '../actions';

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(login, {});
  return (
    <form action={action} className="form" style={{ gap: 12 }}>
      <input type="hidden" name="next" value={next} />
      <label className="field">
        <span>비밀번호</span>
        <input type="password" name="password" autoComplete="current-password" required autoFocus />
      </label>
      {state.error && <p className="notice err" role="alert">{state.error}</p>}
      <button className="btn primary" disabled={pending}>{pending ? '확인 중…' : '로그인'}</button>
    </form>
  );
}
