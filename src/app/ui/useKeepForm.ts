'use client';

import { startTransition, type FormEvent } from 'react';

/**
 * React 19는 서버 액션 제출 뒤 폼을 비운다. 저장이 거부되면 입력이 날아가므로
 * onSubmit으로 직접 넘겨 입력값을 유지한다(성공 시 비우기는 각 폼이 처리).
 */
export function keepForm(dispatch: (f: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => dispatch(data));
  };
}
