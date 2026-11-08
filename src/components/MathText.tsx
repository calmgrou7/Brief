import katex from 'katex';
import { useMemo } from 'react';

/** "$...$" 인라인, "$$...$$" 블록 수식을 포함한 텍스트를 렌더링 */
export function MathText({ text, className }: { text: string; className?: string }) {
  const html = useMemo(() => render(text), [text]);
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function render(text: string): string {
  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/g);
  return parts
    .map((part) => {
      const display = part.startsWith('$$') && part.endsWith('$$') && part.length > 4;
      const inline = !display && part.startsWith('$') && part.endsWith('$') && part.length > 2;
      if (!display && !inline) return esc(part).replace(/\n/g, '<br/>');
      const tex = display ? part.slice(2, -2) : part.slice(1, -1);
      try {
        return katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: 'ignore' });
      } catch {
        return esc(part);
      }
    })
    .join('');
}
