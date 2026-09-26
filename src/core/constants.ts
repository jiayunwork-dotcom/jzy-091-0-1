/**
 * 物理常量。
 *
 * 真空光速采用 1983 年国际计量大会定义值，为固定常数（m/s），
 * 与具体介质无关——Sagnac 公式中的 c 即此真空光速。
 */
export const SPEED_OF_LIGHT = 299_792_458 as const;

/**
 * 开环 Sagnac 相位的测量模糊边界：相位本身以 2π 为周期，
 * |Δφ| 接近 π 时无法仅凭相位区分 Ω 与缠绕后的等价值。
 */
export const PI = Math.PI;

/** 开始判定为“接近 π 模糊”的阈值，默认 π/2。 */
export const DEFAULT_AMBIGUITY_THRESHOLD = PI / 2;

/** 服务对外固定监听端口。 */
export const SERVICE_PORT = 8080;
