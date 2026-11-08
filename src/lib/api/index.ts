import type { Api } from './types';
import { localApi } from './local';
import { createSupabaseApi } from './supabase';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** .env 에 Supabase 주소·공개키가 있으면 서버 모드, 없으면 로컬(데모) 모드 */
export const api: Api = url && key ? createSupabaseApi(url, key) : localApi;
export type * from './types';
