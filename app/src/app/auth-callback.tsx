import { Redirect } from 'expo-router';

// 구글 로그인 후 doit://auth-callback 딥링크로 앱이 열릴 때의 착지점.
// 실제 세션 교환은 로그인 화면의 openAuthSessionAsync 결과에서 처리됩니다.
export default function AuthCallback() {
  return <Redirect href="/" />;
}
