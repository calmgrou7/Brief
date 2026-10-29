import type { TextItem } from './statementParser';

// pdf.js는 PDF를 열 때만 불러온다. 파일은 브라우저 안에서만 읽고 어디에도 보내지 않는다.
export async function readPdfText(file: File): Promise<TextItem[][]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  // 별도 Worker 없이 화면 스레드에서 처리한다. 재무제표 몇 쪽이면 충분히 빠르고,
  // 아티팩트 미리보기·내려받은 HTML 파일(file://)처럼 Worker가 막힌 곳에서도 동작한다.
  const g = globalThis as { pdfjsWorker?: unknown };
  g.pdfjsWorker ??= await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: TextItem[][] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    pages.push(
      content.items
        .filter((it): it is Extract<typeof it, { str: string }> => 'str' in it)
        .map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width })),
    );
  }
  await doc.destroy();
  return pages;
}
