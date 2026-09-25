/**
 * 服务入口：编译产物直接以 `node dist/src/index.js` 运行。
 */

import { buildApp } from "./app";

const PORT = Number(process.env.PORT ?? 8080);
const HOST = "0.0.0.0";

const app = buildApp();

app
  .listen({ port: PORT, host: HOST })
  .then(() => {
    console.log(`fog-sagnac-service listening on http://${HOST}:${PORT}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
