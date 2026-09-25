/**
 * HTTP 层：Fastify 路由。
 *
 *  POST /api/phase   给定几何与单个角速度 → 相位、标度因数、反演角速度
 *  POST /api/scan    同一几何下扫过角速度网格 → 逐点相位序列
 *  GET  /api/reference 内置 ~200 m 参考线圈在地球自转速率下的自检结果
 *  GET  /health      存活探针
 */

import Fastify, { FastifyInstance } from "fastify";
import { C_LIGHT, EARTH_ROTATION_RATE, REFERENCE_COIL } from "./constants";
import { computeGyro } from "./gyro";
import { omegaGrid, scanOmegas } from "./scan";
import {
  validateCoil,
  validateOmega,
  validatePhaseBias,
} from "./validate";

interface PhaseBody {
  radius?: number;
  turns?: number;
  wavelength?: number;
  omega?: number;
  phaseBias?: number;
}

interface ScanBody {
  radius?: number;
  turns?: number;
  wavelength?: number;
  omegas?: number[];
  grid?: { from?: number; to?: number; count?: number };
  phaseBias?: number;
}

function invalidInput(reply: any, reasons: string[]) {
  return reply.status(400).send({
    error: {
      code: "INVALID_INPUT",
      message: "输入参数校验失败",
      reasons,
    },
  });
}

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false });

  app.get("/health", async () => ({ status: "ok" }));

  /** 内置参考配置自检：~200 m 光纤，地球自转速率 → 微弧度级相位。 */
  app.get("/api/reference", async () => {
    const result = computeGyro(REFERENCE_COIL, EARTH_ROTATION_RATE);
    return {
      description:
        "内置参考线圈（约 200 m 光纤）在地球自转角速度下的 Sagnac 相位，供量纲与系数核对",
      constants: { c: C_LIGHT, earthRotationRate: EARTH_ROTATION_RATE },
      result,
    };
  });

  /** 单点：几何 + 角速度 → 相位 / 标度因数 / 反演角速度。 */
  app.post("/api/phase", async (request, reply) => {
    const body = (request.body ?? {}) as PhaseBody;

    const coilCheck = validateCoil(body);
    if (!coilCheck.ok) return invalidInput(reply, coilCheck.reasons);

    const reasons: string[] = [];
    const omegaErr = validateOmega(body.omega);
    if (omegaErr) reasons.push(omegaErr);
    const biasErr = validatePhaseBias(body.phaseBias);
    if (biasErr) reasons.push(biasErr);
    if (reasons.length > 0) return invalidInput(reply, reasons);

    return computeGyro(coilCheck.coil, body.omega as number, body.phaseBias ?? 0);
  });

  /** 扫描：同一几何下对一组角速度逐点真算相位序列。 */
  app.post("/api/scan", async (request, reply) => {
    const body = (request.body ?? {}) as ScanBody;

    const coilCheck = validateCoil(body);
    if (!coilCheck.ok) return invalidInput(reply, coilCheck.reasons);

    const reasons: string[] = [];
    const biasErr = validatePhaseBias(body.phaseBias);
    if (biasErr) reasons.push(biasErr);

    let omegas: number[] | null = null;
    if (Array.isArray(body.omegas)) {
      if (body.omegas.length === 0) {
        reasons.push("omegas 不能为空数组");
      } else {
        body.omegas.forEach((o, i) => {
          const err = validateOmega(o);
          if (err) reasons.push(`omegas[${i}]: ${err}`);
        });
        omegas = body.omegas;
      }
    } else if (body.grid !== undefined && body.grid !== null) {
      const { from, to, count } = body.grid;
      if (typeof from !== "number" || !Number.isFinite(from)) {
        reasons.push("grid.from 必须是有限数值（rad/s）");
      }
      if (typeof to !== "number" || !Number.isFinite(to)) {
        reasons.push("grid.to 必须是有限数值（rad/s）");
      }
      if (!Number.isInteger(count) || (count as number) < 2) {
        reasons.push("grid.count 必须是 ≥ 2 的整数");
      }
      if (reasons.length === 0) {
        omegas = omegaGrid(from as number, to as number, count as number);
      }
    } else {
      reasons.push("必须提供 omegas 数组或 grid {from, to, count}");
    }

    if (reasons.length > 0) return invalidInput(reply, reasons);

    return scanOmegas(coilCheck.coil, omegas as number[], body.phaseBias ?? 0);
  });

  return app;
}
