'use client';

import { removeCompany } from '../../actions';

export function DeleteCompany({ id, name, small }: { id: string; name: string; small?: boolean }) {
  return (
    <form
      action={removeCompany}
      onSubmit={(e) => {
        if (!confirm(`‘${name}’을(를) 삭제할까요?\n노션 휴지통으로 이동하며 30일 안에 노션에서 복구할 수 있습니다.\n접촉이력 등 연결된 기록은 남아 있습니다.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className={`btn danger${small ? ' sm' : ''}`}>삭제</button>
    </form>
  );
}
