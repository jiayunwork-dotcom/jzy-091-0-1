/**
 * 角速度扫描模块。
 *
 * 在同一组线圈几何下，对一组角速度网格逐点真算：
 * 每个点都独立经过 sagnacPhase 正算 -> 反演 -> 模糊判定，
 * 不是用一条过原点的直线采样糊弄（虽然模型本身是线性的，
 * 逐点结果必然落在直线上，但每点的模糊判定与反演是独立计算的，
 * 测试会逐点与单点接口结果核对）。
 */

import { fiberLength } from './geometry';
import { scaleFactor, invertPhase, sagnacPhase } from './phase';
import { assessAmbiguity } from './ambiguity';
import type { CoilGeometry, SweepResult } from './types';

/**
 * 对角速度网格逐点计算 Sagnac 相位。
 *
 * @param geometry 线圈几何（已通过校验）
 * @param omegas   角速度网格（rad/s，已通过校验）
 * @param bias     可选闭环偏置（rad），只作用于反演
 */
export function sweepOmega(
  geometry: CoilGeometry,
  omegas: readonly number[],
  bias = 0,
): SweepResult {
  const length = fiberLength(geometry);
  const k = scaleFactor(geometry.radius, length, geometry.wavelength);

  const points = omegas.map((omega) => {
    // 逐点真算，不复用任何前序点，也不做直线插值。
    const { phase } = sagnacPhase(geometry, omega);
    return {
      omega,
      phase,
      estimatedOmega: invertPhase(phase, k, bias),
      ambiguity: assessAmbiguity(phase),
    };
  });

  return {
    geometry: { ...geometry },
    fiberLength: length,
    scaleFactor: k,
    bias,
    count: points.length,
    points,
  };
}
