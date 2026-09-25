/**
 * 开环测量模糊判定。
 *
 * 开环干涉测量的无模糊区间为 |Δφ| < π。当 |Δφ| 接近 π 时必须显式告警，
 * 绝不把相位折叠回主值区间后返回一个看似正常的角速度。
 * 本模块只判定并生成告警文本，不修改相位本身。
 */

import { AMBIGUITY_WARN_THRESHOLD } from "./constants";

export interface AmbiguityAssessment {
  /** |Δφ| ≥ π/2，接近模糊边界，反演结果需谨慎对待。 */
  ambiguous: boolean;
  /** |Δφ| ≥ π，已超出开环无模糊测量范围。 */
  exceedsUnambiguousRange: boolean;
  /** 告警文本；无模糊风险时为 null。 */
  warning: string | null;
}

export function assessAmbiguity(phase: number): AmbiguityAssessment {
  const abs = Math.abs(phase);
  const exceedsUnambiguousRange = abs >= Math.PI;
  const ambiguous = abs >= AMBIGUITY_WARN_THRESHOLD;

  let warning: string | null = null;
  if (exceedsUnambiguousRange) {
    warning =
      `|Δφ| = ${abs} rad ≥ π：已超出开环无模糊测量范围（±π），` +
      `反演角速度不可靠。相位按原始值返回，未做折叠。`;
  } else if (ambiguous) {
    warning =
      `|Δφ| = ${abs} rad 已超过 π/2，接近 π 模糊边界，` +
      `存在测量模糊风险，请结合闭环或已知量程复核。`;
  }

  return { ambiguous, exceedsUnambiguousRange, warning };
}
