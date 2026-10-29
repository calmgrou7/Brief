import { useState, type ClipboardEvent } from 'react';
import { parseWon, won } from './format';

interface Props {
  id: string;
  value: number;
  onChange: (v: number) => void;
  /** 여러 줄 붙여넣기(엑셀 열 복사) 시 호출 — 처리했으면 true */
  onPasteColumn?: (values: number[]) => boolean;
  suffix?: string;
  ariaLabel?: string;
}

export function MoneyInput({ id, value, onChange, onPasteColumn, suffix, ariaLabel }: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
    if (lines.length > 1 && onPasteColumn) {
      // 엑셀에서 금액 열을 복사하면 탭으로 구분된 마지막 숫자 칸을 쓴다
      const values = lines.map((l) => parseWon(l.split('\t').filter((c) => /\d/.test(c)).pop() ?? '0'));
      if (onPasteColumn(values)) {
        e.preventDefault();
        setDraft(null);
      }
    }
  };
  return (
    <span className="money">
      <input
        id={id}
        inputMode="numeric"
        aria-label={ariaLabel}
        value={draft ?? won(value)}
        onFocus={() => setDraft(value === 0 ? '' : won(value))}
        onBlur={() => setDraft(null)}
        onChange={(e) => {
          setDraft(e.target.value);
          onChange(parseWon(e.target.value));
        }}
        onPaste={onPaste}
      />
      {suffix && <span className="suffix">{suffix}</span>}
    </span>
  );
}
