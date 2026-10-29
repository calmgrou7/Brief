import type { TextItem } from './statementParser';

// pdf.js는 PDF를 열 때만 불러온다. 파일은 브라우저 안에서만 읽고 어디에도 보내지 않는다.
export async function readPdfText(file: File): Promise<TextItem[][]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const { default: workerCode } = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?raw');
  if (!pdfjs.GlobalWorkerOptions.workerPort) {
    const url = URL.createObjectURL(new Blob([workerCode], { type: 'text/javascript' }));
    pdfjs.GlobalWorkerOptions.workerPort = new Worker(url, { type: 'module' });
  }
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
