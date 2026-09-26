/**
 * 开环相位模糊判定。
 *
 * Sagnac 相位对 Ω 是线性的，但干涉强度只对 cos(Δφ) 敏感，
 * 相位以 2π 为周期。开环读数下，|Δφ| 接近 π 时无法区分
 * Ω 与缠绕后的等价值。本模块只负责显式告警：
 *
 *   - 绝不在任何地方把相位折叠回某个“主象限”；
 *   - 进入阈值区给 warning + 原因，|Δφ| ≥ π 标记为完全模糊。
 */

import { DEFAULT_AMBIGUITY_THRESHOLD, PI } from './constants';
import type { AmbiguityReport } from './types';

/**
 * 评估相位的开环模糊程度。
 *
 * @param phase     未折叠的原始 Sagnac 相位（rad）
 * @param threshold 告警阈值（rad），默认 π/2；|Δφ| 超过它即告警
 */
export function assessAmbiguity(
  phase: number,
  threshold: number = DEFAULT_AMBIGUITY_THRESHOLD,
): AmbiguityReport {
  const magnitude = Math.abs(phase);
  const ratioToPi = magnitude / PI;

  if (magnitude >= PI) {
    return {
      warning: true,
      message:
        `开环相位 |Δφ|=${magnitude.toExponential(6)} rad 已达到或超过 π，` +
        '存在整周缠绕，角速度无法唯一确定，结果未经折叠请勿直接当作有效读数。',
      ratioToPi,
    };
  }

  if (magnitude >= threshold) {
    return {
      warning: true,
      message:
        `开环相位 |Δφ|=${magnitude.toExponential(6)} rad 已接近 π（阈值 ` +
        `${threshold.toExponential(6)} rad），进入干涉测量模糊区，反演角速度可能存在整周歧义。`,
      ratioToPi,
    };
  }

  return { warning: false, message: null, ratioToPi };
}
