// 회원 탈퇴: auth 사용자 삭제 → 외래키 cascade로 프로필·목표·할 일·사용량·구독기록 모두 삭제
// (Google Play 구독 자체는 사용자가 Play 스토어에서 해지해야 함 — 앱에서 안내)
import { admin, getUser, json } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ message: 'Method not allowed' }, 405);
  const user = await getUser(req);
  if (!user) return json({ message: 'unauthorized' }, 401);

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error(error);
    return json({ message: '탈퇴 처리에 실패했어요.' }, 500);
  }
  return json({ ok: true });
});
