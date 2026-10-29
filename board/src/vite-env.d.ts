/// <reference types="vite/client" />

// 서비스를 추가하면 같은 형식으로 늘린다.
interface ImportMetaEnv {
  readonly VITE_CHAEUM_APP_URL?: string;
  readonly VITE_CHAEUM_SUMMARY_URL?: string;
  readonly VITE_CHAEUM_SUMMARY_TOKEN?: string;
  readonly VITE_CHAEUM_EMBED_URL?: string;
  readonly VITE_WIDLY_APP_URL?: string;
  readonly VITE_WIDLY_SUMMARY_URL?: string;
  readonly VITE_WIDLY_SUMMARY_TOKEN?: string;
  readonly VITE_WIDLY_EMBED_URL?: string;
  readonly [key: `VITE_${string}`]: string | undefined;
}
