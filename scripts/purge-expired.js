// 보유기간이 지난 상담신청 개인정보 파기 (매일/매주 실행 권장)
import dotenv from 'dotenv';
dotenv.config({ quiet: true });
const { purgeExpired } = await import('../server/leads.js');
console.log(`파기된 신청 건수: ${purgeExpired()}`);
