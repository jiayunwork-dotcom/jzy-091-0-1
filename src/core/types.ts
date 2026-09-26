/**
 * 干涉陀螺共享类型定义。
 */

/** 光纤线圈几何与光源参数（全部为 SI 单位）。 */
export interface CoilGeometry {
  /** 光纤环半径 R（m），必须 > 0。 */
  radius: number;
  /** 匝数 N（圈），必须 > 0。 */
  turns: number;
  /** 光源真空波长 λ（m），必须 > 0。 */
  wavelength: number;
}

/** 正算 / 反演单点计算结果。 */
export interface PhaseResult {
  /** 光纤总长度 L = 2π·R·N（m）。 */
  fiberLength: number;
  /** 开环标度因数 K = 4π·R·L / (λ·c)（s，即 rad/(rad/s)）。 */
  scaleFactor: number;
  /** Sagnac 干涉相位差 Δφ（rad，未折叠的原始值）。 */
  phase: number;
  /** 由相位反推的角速度 Ω̂ = (Δφ - bias) / K（rad/s）。 */
  estimatedOmega: number;
  /** 输入角速度 Ω（rad/s）。 */
  omega: number;
  /** 已扣除的闭环偏置（rad）。 */
  bias: number;
  /** 开环模糊判定。 */
  ambiguity: AmbiguityReport;
}

/** 模糊判定报告：只告警，绝不折叠相位。 */
export interface AmbiguityReport {
  /** |Δφ| 是否进入接近 π 的模糊区。 */
  warning: boolean;
  /** 人类可读的原因说明；无告警时为 null。 */
  message: string | null;
  /** |Δφ| 与 π 的比值，便于上层自己判据。 */
  ratioToPi: number;
}

/** 角速度扫描网格上的一个采样点。 */
export interface SweepPoint {
  omega: number;
  phase: number;
  estimatedOmega: number;
  ambiguity: AmbiguityReport;
}

/** 扫描结果。 */
export interface SweepResult {
  geometry: CoilGeometry;
  fiberLength: number;
  scaleFactor: number;
  bias: number;
  count: number;
  points: SweepPoint[];
}
