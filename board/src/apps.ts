// 보드에 올라가는 앱 목록. 앱을 추가하면 여기에 한 줄만 늘리면 된다.
// id는 각 앱이 이벤트를 보낼 때 쓰는 값이고, supabase/ops_events.sql의 ops_apps.id와 같아야 한다.

export interface AppInfo {
  id: string;
  name: string;
  description: string;
  url: string;
  color: string;
}

export const APPS: AppInfo[] = [
  {
    id: 'chaeum',
    name: '채움',
    description: '법인 컨설팅 · 가결산 진단',
    url: import.meta.env.VITE_CHAEUM_URL ?? '',
    color: '#176b70',
  },
  {
    id: 'widly',
    name: '위들리',
    description: '위들리 운영',
    url: import.meta.env.VITE_WIDLY_URL ?? '',
    color: '#8a5a1c',
  },
];

export function appById(id: string): AppInfo | undefined {
  return APPS.find((a) => a.id === id);
}
