// 웹푸시용 VAPID 키 생성 → .env 에 붙여넣기
import { generateVAPIDKeys } from 'web-push';
const k = generateVAPIDKeys();
console.log(`VAPID_PUBLIC_KEY=${k.publicKey}\nVAPID_PRIVATE_KEY=${k.privateKey}`);
