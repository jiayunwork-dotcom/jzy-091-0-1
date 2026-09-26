/**
 * GET /api/reference —— 内置约 200 m 参考线圈在地球自转
 * 量级角速度下的快速核对结果（微弧度级相位）。
 * GET /health       —— 存活探针。
 */

import type { FastifyInstance } from 'fastify';
import { referenceSnapshot } from '../config/reference';

export function registerReferenceRoute(app: FastifyInstance): void {
  app.get('/api/reference', (_request, reply) => {
    return reply.send({
      description:
        '内置参考线圈：R=0.1 m, N=318（L≈199.8 m），λ=1550 nm；地球自转角速度量级下的 Sagnac 相位',
      ...referenceSnapshot(),
    });
  });
}
