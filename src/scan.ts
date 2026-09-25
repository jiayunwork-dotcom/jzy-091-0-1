/**
 * 角速度扫描：在同一几何下对一组角速度逐点真实计算相位。
 *
 * 每个采样点都独立走完整主链路（computeGyro），
 * 不是用一条过原点的直线插值出来的。
 */

import { computeGyro, GyroResult } from "./gyro";
import { CoilConfig } from "./validate";

export interface ScanPoint {
  omega: number;
  phase: number;
  omegaHat: number;
  ambiguous: boolean;
  warning: string | null;
}

export interface ScanResult {
  coil: CoilConfig;
  fiberLength: number;
  scaleFactor: number;
  points: ScanPoint[];
}

/** 生成等间距角速度网格（含端点）。count 必须 ≥ 2。 */
export function omegaGrid(from: number, to: number, count: number): number[] {
  const step = (to - from) / (count - 1);
  return Array.from({ length: count }, (_, i) => from + i * step);
}

/** 对给定角速度序列逐点计算。 */
export function scanOmegas(
  coil: CoilConfig,
  omegas: number[],
  phaseBias = 0,
): ScanResult {
  const points = omegas.map((omega) => {
    const r: GyroResult = computeGyro(coil, omega, phaseBias);
    return {
      omega: r.omega,
      phase: r.phase,
      omegaHat: r.omegaHat,
      ambiguous: r.ambiguity.ambiguous,
      warning: r.ambiguity.warning,
    };
  });

  // 几何量从第一个点取（所有点共享同一配置，逐点重算保证一致）
  const first = computeGyro(coil, omegas[0] ?? 0, phaseBias);
  return {
    coil,
    fiberLength: first.fiberLength,
    scaleFactor: first.scaleFactor,
    points,
  };
}
