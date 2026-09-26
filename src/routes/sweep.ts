/**
 * POST /api/sweep —— 同一几何下的角速度网格扫描。
 *
 * 返回相位随角速度变化的逐点采样序列，每个点独立真算，
 * 并各自携带反演角速度与模糊判定。
 */

import type { FastifyInstance } from 'fastify';
import { sweepOmega } from '../core/sweep';
import {
  validateBias,
  validateGeometry,
  validateOmegaGrid,
} from '../core/validation';

interface SweepBody {
  radius?: unknown;
  turns?: unknown;
  wavelength?: unknown;
  omegas?: unknown;
  bias?: unknown;
}

export function registerSweepRoute(app: FastifyInstance): void {
  app.post('/api/sweep', (request, reply) => {
    const body = (request.body ?? {}) as SweepBody;

    const geometry = validateGeometry(body);
    const omegas = validateOmegaGrid(body.omegas);
    const bias = validateBias(body.bias);

    const result = sweepOmega(geometry, omegas, bias);

    return reply.send(result);
  });
}
