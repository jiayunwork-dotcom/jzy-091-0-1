/**
 * 内置参考线圈配置，供快速核对量纲与系数。
 *
 * R = 0.1 m、N = 318 圈：
 *   L = 2π · 0.1 · 318 ≈ 199.8 m（约两百米光纤）
 * λ = 1550 nm（典型通信波段光源）
 *
 * 在地球自转角速度量级（约 7.29e-5 rad/s）下，
 * Δφ ≈ 3.9e-5 rad ≈ 39 μrad，是可被检出的微弧度级信号。
 */

import { evaluatePhase } from '../core/phase';
import type { CoilGeometry } from '../core/types';

export const REFERENCE_COIL: CoilGeometry = {
  radius: 0.1,
  turns: 318,
  wavelength: 1550e-9,
};

/** 地球自转角速度（rad/s，WGS-84 采用值 7.292115e-5）。 */
export const EARTH_ROTATION_RATE = 7.292115e-5;

/** 参考配置在地球自转量级下的预期相位量级（μrad），仅用于文档/自检输出。 */
export function referenceSnapshot() {
  const result = evaluatePhase(REFERENCE_COIL, EARTH_ROTATION_RATE);
  return {
    geometry: { ...REFERENCE_COIL },
    earthRotationRate: EARTH_ROTATION_RATE,
    fiberLength: result.fiberLength,
    scaleFactor: result.scaleFactor,
    phase: result.phase,
    phaseMicroRadians: result.phase * 1e6,
    estimatedOmega: result.estimatedOmega,
    ambiguity: result.ambiguity,
  };
}
