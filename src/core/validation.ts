/**
 * 输入校验模块。
 *
 * 半径 R、匝数 N、波长 λ 任一小于等于零，或不是有限数，
 * 都抛出带逐字段原因的 ValidationError，由 HTTP 层转成错误 JSON。
 */

import type { CoilGeometry } from './types';

/** 校验失败错误，携带可直接序列化给客户端的字段级原因。 */
export class ValidationError extends Error {
  readonly details: Record<string, string>;

  constructor(message: string, details: Record<string, string>) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * 校验线圈几何。R / N / λ 必须都是严格大于 0 的有限数。
 */
export function validateGeometry(raw: unknown): CoilGeometry {
  const details: Record<string, string> = {};
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ValidationError('请求体必须是包含几何参数的 JSON 对象', {
      body: '期望对象 {radius, turns, wavelength, ...}',
    });
  }

  const obj = raw as Record<string, unknown>;
  const geometry = {} as CoilGeometry;

  const positiveFields: ReadonlyArray<{
    key: keyof CoilGeometry;
    label: string;
    unit: string;
  }> = [
    { key: 'radius', label: '光纤环半径 R', unit: 'm' },
    { key: 'turns', label: '匝数 N', unit: '圈' },
    { key: 'wavelength', label: '真空波长 λ', unit: 'm' },
  ];

  for (const { key, label, unit } of positiveFields) {
    const value = obj[key];
    if (value === undefined || value === null) {
      details[key] = `${label}缺失（单位：${unit}）`;
    } else if (!isFiniteNumber(value)) {
      details[key] = `${label}必须是有限数值，收到：${String(value)}`;
    } else if (value <= 0) {
      details[key] = `${label}必须严格大于 0，收到：${String(value)}`;
    } else {
      geometry[key] = value;
    }
  }

  if (Object.keys(details).length > 0) {
    throw new ValidationError('线圈几何参数校验失败', details);
  }

  return geometry;
}

/**
 * 校验单个角速度：必须是有限数（允许负，反号对称性需要）。
 */
export function validateOmega(raw: unknown, field = 'omega'): number {
  if (!isFiniteNumber(raw)) {
    throw new ValidationError('角速度参数校验失败', {
      [field]: '角速度 Ω 必须是有限数值（rad/s），允许为负',
    });
  }
  return raw;
}

/**
 * 校验闭环偏置修正量（可选，默认 0）：必须是有限数。
 */
export function validateBias(raw: unknown): number {
  if (raw === undefined || raw === null) return 0;
  if (!isFiniteNumber(raw)) {
    throw new ValidationError('偏置参数校验失败', {
      bias: '闭环偏置 bias 必须是有限数值（rad）',
    });
  }
  return raw;
}

/**
 * 校验角速度网格：非空有限长度数组，每个元素为有限数。
 */
export function validateOmegaGrid(raw: unknown): number[] {
  const details: Record<string, string> = {};

  if (!Array.isArray(raw)) {
    throw new ValidationError('角速度网格校验失败', {
      omegas: 'omegas 必须是角速度数值数组（rad/s）',
    });
  }
  if (raw.length === 0) {
    details.omegas = '角速度网格不能为空，至少包含一个采样点';
  }
  if (raw.length > 10_000) {
    details.omegas = `角速度网格最多 10000 个采样点，收到 ${raw.length} 个`;
  }

  const omegas: number[] = [];
  raw.forEach((value, index) => {
    if (!isFiniteNumber(value)) {
      details[`omegas[${index}]`] =
        `网格第 ${index} 点角速度必须是有限数值，收到：${String(value)}`;
    } else {
      omegas.push(value);
    }
  });

  if (Object.keys(details).length > 0) {
    throw new ValidationError('角速度网格校验失败', details);
  }

  return omegas;
}
