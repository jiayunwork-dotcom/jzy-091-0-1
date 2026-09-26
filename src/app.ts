/**
 * Fastify 应用装配。
 *
 * 路由按职责拆分注册；错误处理统一把 ValidationError 与请求体
 * 解析错误转成带原因的错误 JSON。计算全是无状态纯函数，
 * 不同线圈配置的请求互不共享可变状态，天然隔离。
 */

import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import { registerPhaseRoute } from './routes/phase';
import { registerSweepRoute } from './routes/sweep';
import { registerReferenceRoute } from './routes/reference';
import { ValidationError } from './core/validation';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: true,
    bodyLimit: 1 * 1024 * 1024,
  });

  app.get('/health', () => ({ status: 'ok', service: 'fog-sagnac' }));

  registerReferenceRoute(app);
  registerPhaseRoute(app);
  registerSweepRoute(app);

  // 校验错误 -> 400，逐字段原因原样带回。
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof ValidationError) {
      return reply.status(400).send({
        error: {
          code: 'INVALID_INPUT',
          message: error.message,
          details: error.details,
        },
      });
    }

    // Fastify 的 JSON 解析错误（FST_ERR_CTP_INVALID_MEDIA_TYPE 等）。
    const statusCode =
      typeof error.statusCode === 'number' ? error.statusCode : 500;
    if (statusCode >= 400 && statusCode < 500) {
      return reply.status(statusCode).send({
        error: {
          code: error.code ?? 'BAD_REQUEST',
          message: error.message,
        },
      });
    }

    request.log.error(error);
    return reply.status(500).send({
      error: { code: 'INTERNAL', message: '服务内部错误' },
    });
  });

  app.setNotFoundHandler((_request, reply) => {
    return reply.status(404).send({
      error: {
        code: 'NOT_FOUND',
        message: '接口不存在；可用：GET /health, GET /api/reference, POST /api/phase, POST /api/sweep',
      },
    });
  });

  return app;
}
