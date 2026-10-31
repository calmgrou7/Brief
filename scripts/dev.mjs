import { spawn } from "node:child_process";
const password = process.env.ADMIN_PASSWORD || "bridgenode-local";
if (!process.env.ADMIN_PASSWORD)
  console.log(
    `\n로컬 개발용 관리자 비밀번호: ${password}  (운영에서는 ADMIN_PASSWORD 설정)\n`,
  );
const opts = {
  stdio: "inherit",
  env: { ...process.env, ADMIN_PASSWORD: password, HOST: "127.0.0.1" },
};
const api = spawn(
  process.execPath,
  ["--watch", "--env-file-if-exists=.env", "server/index.mjs"],
  opts,
);
const web = spawn(process.execPath, ["node_modules/vite/bin/vite.js"], opts);
function stop() {
  api.kill();
  web.kill();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
api.on("exit", () => web.kill());
web.on("exit", () => api.kill());
