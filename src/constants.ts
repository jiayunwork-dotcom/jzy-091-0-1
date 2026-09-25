/**
 * 物理常数与内置参考线圈配置。
 *
 * 参考配置：约 200 m 光纤的线圈，用于在地球自转量级的角速度下
 * 快速核对量纲与系数（预期得到微弧度量级的 Sagnac 相位）。
 */

/** 真空光速，固定常数 (m/s)。 */
export const C_LIGHT = 299_792_458;

/** 地球自转角速度 (rad/s)，用于参考配置的自检。 */
export const EARTH_ROTATION_RATE = 7.2921159e-5;

/** 内置参考线圈：R = 5 cm，N = 637 匝，λ = 1550 nm → L ≈ 200.12 m。 */
export const REFERENCE_COIL = {
  radius: 0.05,
  turns: 637,
  wavelength: 1550e-9,
} as const;

/**
 * 开环模糊告警阈值：|Δφ| 超过 π/2 即认为接近 π 模糊边界。
 * |Δφ| ≥ π 时则完全超出开环无模糊测量范围。
 */
export const AMBIGUITY_WARN_THRESHOLD = Math.PI / 2;
