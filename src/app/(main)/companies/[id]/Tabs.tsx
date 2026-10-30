'use client';

import { useState, type ReactNode } from 'react';

export interface TabDef { key: string; label: string; count?: number; content: ReactNode }

export function Tabs({ tabs, initial }: { tabs: TabDef[]; initial: string }) {
  const [on, setOn] = useState(tabs.some((t) => t.key === initial) ? initial : tabs[0].key);
  const pick = (k: string) => {
    setOn(k);
    // 새로고침·공유해도 같은 탭이 열리도록 주소만 바꾼다(페이지 이동 없음)
    const u = new URL(window.location.href);
    u.searchParams.set('tab', k);
    u.searchParams.delete('saved');
    window.history.replaceState(null, '', u);
  };
  return (
    <>
      <div className="dtabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.key} type="button" role="tab" id={`tab-${t.key}`} aria-controls={`panel-${t.key}`}
            aria-selected={on === t.key} className="dtab" onClick={() => pick(t.key)}>
            {t.label}{t.count !== undefined && <span className="n">{t.count}</span>}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <section key={t.key} role="tabpanel" id={`panel-${t.key}`} aria-labelledby={`tab-${t.key}`} hidden={on !== t.key}>
          {t.content}
        </section>
      ))}
    </>
  );
}
