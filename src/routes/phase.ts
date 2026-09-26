/**
 * POST /api/phase —— 单点主链路。
 *
 * 输入几何 + 单个角速度，返回：
 *   光纤总长 L、开环标度因数 K、Sagnac 相位 Δφ、
 *   反演角速度 Ω̂、开环模糊判定。
 * 可选 bias（rad）为闭环偏置修正薄涂层，只作用于反演。
 */

import type { FastifyInstance } from 'fastify';
import { evaluatePhase } from '../core/phase';
import {
  validateBias,
  validateGeometry,
  validateOmega,
} from '../core/validation';

interface PhaseBody {
  radius?: unknown;
  turns?: unknown;
  wavelength?: unknown;
  omega?: unknown;
  bias?: unknown;
}

export function registerPhaseRoute(app: FastifyInstance): void {
  app.post('/api/phase', (request, reply) => {
    const body = (request.body ?? {}) as PhaseBody;

    // 三类参数各自独立校验；任何一项不合法都会由全局错误处理器
    // 转成带原因的 400 JSON。
    const geometry = validateGeometry(body);
    const omega = validateOmega(body.omega);
    const bias = validateBias(body.bias);

    const result = evaluatePhase(geometry, omega, bias);

    return reply.send({
      geometry,
      input: { omega, bias },
      fiberLength: result.fiberLength,
      scaleFactor: result.scaleFactor,
      phase: result.phase,
      estimatedOmega: result.estimatedOmega,
      ambiguity: result.ambiguity,
    });
  });
}
