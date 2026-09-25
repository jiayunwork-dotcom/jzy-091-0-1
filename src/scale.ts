/**
 * Sagnac 相位与开环标度因数。
 *
 * 开环标度因数：K = 4π·R·L / (λ·c)   （单位 rad·s，即每 rad/s 输入产生的相位 rad）
 * 正算相位：    Δφ = K·Ω
 * 反演角速度：  Ω̂ = Δφ / K
 *
 * 本模块只做纯函数计算，不持有任何状态，不同线圈配置互不渗透。
 */

import { C_LIGHT } from "./constants";

/**
 * 开环标度因数 K = 4π·R·L / (λ·c)。
 * @param radius    环半径 R (m)
 * @param fiberLen  光纤总长 L (m)，必须来自 geometry.fiberLength（含匝数）
 * @param wavelength 真空波长 λ (m)
 */
export function scaleFactor(
  radius: number,
  fiberLen: number,
  wavelength: number,
): number {
  return (4 * Math.PI * radius * fiberLen) / (wavelength * C_LIGHT);
}

/** 正算：由角速度求 Sagnac 相位差 Δφ = K·Ω。 */
export function phaseFromOmega(k: number, omega: number): number {
  return k * omega;
}

/** 反演：由相位求角速度 Ω̂ = Δφ / K。 */
export function omegaFromPhase(phase: number, k: number): number {
  return phase / k;
}
