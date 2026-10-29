import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  // 아티팩트 미리보기용 한 파일 묶음을 위해 지연 로딩 모듈도 한 번들에 넣는다
  build: { rollupOptions: { output: { inlineDynamicImports: true } } },
  test: { globals: true },
});
