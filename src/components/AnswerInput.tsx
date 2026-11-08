import { useState, type FormEvent } from 'react';
import type { Problem } from '../types';
import { useApp } from '../state';
import { MathText } from './MathText';

interface Props {
  problem: Problem;
  disabled?: boolean;
  submitLabel: string;
  onSubmit: (input: string | number) => void;
}

/** 정답 유형(객관식/수치/단답)에 맞는 입력 UI */
export function AnswerInput({ problem, disabled, submitLabel, onSubmit }: Props) {
  const { lang, t } = useApp();
  const [value, setValue] = useState('');
  const [choice, setChoice] = useState<number | null>(null);
  const a = problem.answer;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (a.kind === 'choice') { if (choice !== null) onSubmit(choice); }
    else if (value.trim()) onSubmit(value);
  };

  return (
    <form onSubmit={submit} className="answer">
      {a.kind === 'choice' ? (
        <div className="choices" role="radiogroup">
          {a.options.map((o, i) => (
            <button type="button" key={i} role="radio" aria-checked={choice === i} disabled={disabled}
              className={`choice ${choice === i ? 'on' : ''}`} onClick={() => setChoice(i)}>
              <span className="choice-key">{String.fromCharCode(65 + i)}</span>
              <MathText text={o[lang]} />
            </button>
          ))}
        </div>
      ) : (
        <input className="input big" value={value} onChange={(e) => setValue(e.target.value)} disabled={disabled}
          placeholder={a.kind === 'numeric' ? t.practice.yourAnswer : '…'} inputMode={a.kind === 'numeric' ? 'decimal' : 'text'}
          autoComplete="off" aria-label={t.practice.yourAnswer} />
      )}
      <button className="btn primary block" disabled={disabled || (a.kind === 'choice' ? choice === null : !value.trim())}>
        {submitLabel}
      </button>
    </form>
  );
}
