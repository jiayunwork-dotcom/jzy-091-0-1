/**
 * 陀螺主链路编排：几何 → 标度 → 正算相位 → （可选闭环偏置）→ 反演角速度。
 *
 * 全部为纯函数，无任何共享可变状态；同一进程内任意多组线圈配置
 * 的计算互不影响。
 */

import { assessAmbiguity, AmbiguityAssessment } from "./ambiguity";
import { fiberLength } from "./geometry";
import { omegaFromPhase, phaseFromOmega, scaleFactor } from "./scale";
import { CoilConfig } from "./validate";

export interface GyroResult {
  coil: CoilConfig;
  /** 光纤总长 L = 2π·R·N (m) */
  fiberLength: number;
  /** 开环标度因数 K = 4π·R·L / (λ·c) (rad·s) */
  scaleFactor: number;
  /** 输入角速度 Ω (rad/s) */
  omega: number;
  /** 开环 Sagnac 相位差 Δφ (rad)，原始值，未折叠 */
  phase: number;
  /** 闭环偏置修正量 (rad)，未启用时为 0 */
  phaseBias: number;
  /** 由 (Δφ − bias) / K 反演的角速度 (rad/s) */
  omegaHat: number;
  /** 反演残差 Ω̂ − Ω (rad/s)，用于核对主链路自洽性 */
  inversionResidual: number;
  ambiguity: AmbiguityAssessment;
}

/**
 * 单点计算：给定线圈配置与角速度，返回相位、标度因数与反演角速度。
 * @param coil      已校验的线圈配置
 * @param omega     输入角速度 (rad/s)
 * @param phaseBias 闭环偏置修正（rad），薄层实现：反演前从相位中扣除
 */
export function computeGyro(
  coil: CoilConfig,
  omega: number,
  phaseBias = 0,
): GyroResult {
  const L = fiberLength(coil.radius, coil.turns);
  const K = scaleFactor(coil.radius, L, coil.wavelength);

  // 正算：开环相位（保持原始值，绝不折叠）
  const phase = phaseFromOmega(K, omega);

  // 反演：闭环偏置修正只作用在反演一侧
  const correctedPhase = phase - phaseBias;
  const omegaHat = omegaFromPhase(correctedPhase, K);

  return {
    coil,
    fiberLength: L,
    scaleFactor: K,
    omega,
    phase,
    phaseBias,
    omegaHat,
    inversionResidual: omegaHat - omega,
    ambiguity: assessAmbiguity(phase),
  };
}
