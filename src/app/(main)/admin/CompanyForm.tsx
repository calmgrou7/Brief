'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { saveCompany, type FormState } from '../../actions';
import { keepForm } from '../../ui/useKeepForm';
import { ENTITY, INTERESTS, PRIORITY, REGION, SOURCE, STATUS, TASKS, type Company } from '@/lib/schema';

type Values = Omit<Company, 'id' | 'url'> & { id?: string };

export function CompanyForm({ c }: { c: Values }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveCompany, {});
  const editing = Boolean(c.id);
  return (
    <form action={action} onSubmit={keepForm(action)} className="form">
      {c.id && <input type="hidden" name="id" value={c.id} />}

      <section className="card">
        <fieldset className="fieldset">
          <legend>기본 정보</legend>
          <div className="fields">
            <label className="field full"><span>기업명<em>*</em></span><input name="name" defaultValue={c.name} required /></label>
            <Select name="status" label="관리상태" value={c.status} options={STATUS} />
            <Select name="priority" label="우선순위" value={c.priority} options={PRIORITY} blank="미지정" />
            <label className="field"><span>사업자등록번호</span><input name="bizNo" defaultValue={c.bizNo} inputMode="numeric" placeholder="000-00-00000" /><span className="hint">중복 등록을 막는 기준입니다.</span></label>
            <label className="field"><span>법인등록번호</span><input name="corpNo" defaultValue={c.corpNo} inputMode="numeric" /></label>
            <Select name="entity" label="기업형태" value={c.entity} options={ENTITY} blank="선택" />
            <label className="field"><span>업종</span><input name="industry" defaultValue={c.industry} /></label>
            <Select name="region" label="지역" value={c.region} options={REGION} blank="선택" />
            <label className="field"><span>설립일</span><input type="date" name="founded" defaultValue={c.founded.slice(0, 10)} /></label>
            <label className="field"><span>상시근로자수</span><input name="employees" inputMode="numeric" defaultValue={c.employees ?? ''} /></label>
            <label className="field"><span>최근 매출(원)</span><input name="revenue" inputMode="numeric" defaultValue={c.revenue ?? ''} placeholder="예) 8600000000" /></label>
            <label className="field full"><span>주소</span><input name="address" defaultValue={c.address} /></label>
          </div>
        </fieldset>
      </section>

      <section className="card">
        <fieldset className="fieldset">
          <legend>연락처</legend>
          <div className="fields">
            <label className="field"><span>대표자</span><input name="ceo" defaultValue={c.ceo} /></label>
            <label className="field"><span>대표 휴대폰</span><input type="tel" name="mobile" defaultValue={c.mobile} placeholder="010-0000-0000" /></label>
            <label className="field"><span>회사 전화</span><input type="tel" name="phone" defaultValue={c.phone} /></label>
            <label className="field"><span>이메일</span><input type="email" name="email" defaultValue={c.email} /></label>
          </div>
        </fieldset>
      </section>

      <section className="card">
        <fieldset className="fieldset">
          <legend>컨설팅</legend>
          <Checks name="tasks" label="진행업무" values={c.tasks} options={TASKS} />
          <Checks name="interests" label="대표 관심사" values={c.interests} options={INTERESTS} />
          <div className="fields">
            <label className="field full"><span>대표 관심사 메모</span><textarea name="interestMemo" defaultValue={c.interestMemo} /></label>
            <label className="field full"><span>제공 예정 솔루션</span><textarea name="plannedSolution" defaultValue={c.plannedSolution} /></label>
            <label className="field full"><span>내년 목표</span><textarea name="nextGoal" defaultValue={c.nextGoal} /></label>
            <label className="field"><span>다음 액션</span><input name="nextAction" defaultValue={c.nextAction} /></label>
            <label className="field"><span>다음 액션일</span><input type="date" name="nextActionDate" defaultValue={c.nextActionDate.slice(0, 10)} /></label>
          </div>
        </fieldset>
      </section>

      <section className="card">
        <fieldset className="fieldset">
          <legend>관리</legend>
          <div className="fields">
            <Select name="source" label="데이터출처" value={c.source || '직접입력'} options={SOURCE} />
            <label className="field"><span>웹앱 기업ID</span><input name="webappId" defaultValue={c.webappId} /><span className="hint">기업컨설팅 웹앱 연동 시 자동 입력됩니다.</span></label>
            <label className="field full"><span>비고</span><textarea name="note" defaultValue={c.note} /></label>
          </div>
          <p className="hint">사업자등록증 파일은 노션 페이지의 ‘사업자등록증’ 칸에 올려 주세요.</p>
        </fieldset>
      </section>

      {state.error && <p className="notice err" role="alert">{state.error}</p>}
      <div className="form-actions">
        <Link href={editing ? `/companies/${c.id}` : '/admin'} className="btn">취소</Link>
        <button className="btn primary" disabled={pending}>{pending ? '노션에 저장 중…' : editing ? '수정 저장' : '업체 등록'}</button>
      </div>
    </form>
  );
}

function Select({ name, label, value, options, blank }: { name: string; label: string; value: string; options: readonly string[]; blank?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select name={name} defaultValue={value}>
        {blank !== undefined && <option value="">{blank}</option>}
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}

function Checks({ name, label, values, options }: { name: string; label: string; values: string[]; options: readonly string[] }) {
  return (
    <div className="field" role="group" aria-label={label}>
      <span>{label}</span>
      <div className="checks">
        {options.map((o) => (
          <label key={o}><input type="checkbox" name={name} value={o} defaultChecked={values.includes(o)} /><span>{o}</span></label>
        ))}
      </div>
    </div>
  );
}
