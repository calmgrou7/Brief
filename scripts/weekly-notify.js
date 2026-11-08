// 주간 공고 수집 + 맞춤 알림 발송 (서버 내장 cron 대신 외부 스케줄러/GitHub Actions 로 돌릴 때 사용)
import dotenv from 'dotenv';
dotenv.config({ quiet: true });
const { runWeekly } = await import('../server/push.js');
const summary = await runWeekly({ collectOnly: process.argv.includes('--collect-only') });
console.log(JSON.stringify(summary, null, 2));
