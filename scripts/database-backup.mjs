// 운영 DB 온라인 백업: npm run db:backup  → backups/bridgenode-YYYYMMDD-HHMMSS.sqlite
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
const source = join(
  resolve(process.env.DATA_DIR || ".data"),
  "bridgenode.sqlite",
);
if (!existsSync(source)) {
  console.error(`DB 파일이 없습니다: ${source}`);
  process.exit(1);
}
const outDir = resolve(process.argv[2] || "backups");
mkdirSync(outDir, { recursive: true });
const stamp = new Date()
  .toISOString()
  .replace(/[-:]/g, "")
  .replace("T", "-")
  .slice(0, 15);
const target = join(outDir, `bridgenode-${stamp}.sqlite`);
const db = new DatabaseSync(source);
db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
db.close();
const check = new DatabaseSync(target, { readOnly: true });
const ok = check.prepare("PRAGMA integrity_check").get();
const n = check.prepare("SELECT COUNT(*) AS n FROM records").get().n;
check.close();
console.log(
  `백업 완료: ${target} (레코드 ${n}개, 무결성 ${Object.values(ok)[0]})`,
);
