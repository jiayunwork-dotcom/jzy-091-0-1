/**
 * 服务入口：装配 Fastify 并监听固定端口 8080。
 */

import { buildApp } from './app';
import { SERVICE_PORT } from './core/constants';

async function main(): Promise<void> {
  const app = buildApp();

  const shutdown = async (signal: string) => {
    app.log.info(`收到 ${signal}，正在关闭服务…`);
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  try {
    await app.listen({ host: '0.0.0.0', port: SERVICE_PORT });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
