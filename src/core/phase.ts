/**
 * Sagnac 相位正算、开环标度因数与角速度反演。
 *
 *   L    = 2π · R · N                     （见 geometry 模块）
 *   Δφ   = 4π · R · L · Ω / (λ · c)
 *   K    = 4π · R · L / (λ · c)           （开环标度因数）
 *   Ω̂   = (Δφ - bias) / K                （反演；bias 为闭环薄修正层，默认 0）
 *
 * 这里返回的 Δφ 是未经折叠的原始相位；模糊问题由 ambiguity 模块显式告警，
 * 不在此处做任何象限折叠。
 */

import { SPEED_OF_LIGHT } from './constants';
import { fiberLength } from './geometry';
import { assessAmbiguity } from './ambiguity';
import type { CoilGeometry, PhaseResult } from './types';

/**
 * 开环标度因数 K（s，即每 rad/s 输入角速度对应的相位 rad 数）。
 * L 必须是含匝数 N 的光纤总长，不能传一圈周长。
 */
export function scaleFactor(
  radius: number,
  length: number,
  wavelength: number,
): number {
  return (4 * Math.PI * radius * length) / (wavelength * SPEED_OF_LIGHT);
}

/**
 * Sagnac 干涉相位差正算 Δφ = K · Ω（rad）。
 * 对 Ω 为线性、奇函数：Ω 反号则 Δφ 反号且绝对值不变。
 */
export function sagnacPhase(
  geometry: CoilGeometry,
  omega: number,
): { phase: number; length: number; k: number } {
  const length = fiberLength(geometry);
  const k = scaleFactor(geometry.radius, length, geometry.wavelength);
  return { phase: k * omega, length, k };
}

/**
 * 由测得相位反推角速度：Ω̂ = (Δφ - bias) / K。
 * 不做任何相位折叠；调用方应同时参考模糊告警。
 */
export function invertPhase(
  phase: number,
  k: number,
  bias = 0,
): number {
  return (phase - bias) / k;
}

/**
 * 单点主链路：几何 + 角速度 -> 相位、标度因数、反演角速度与模糊判定。
 */
export function evaluatePhase(
  geometry: CoilGeometry,
  omega: number,
  bias = 0,
): PhaseResult {
  const { phase, length, k } = sagnacPhase(geometry, omega);
  return {
    fiberLength: length,
    scaleFactor: k,
    phase,
    estimatedOmega: invertPhase(phase, k, bias),
    omega,
    bias,
    ambiguity: assessAmbiguity(phase),
  };
}
