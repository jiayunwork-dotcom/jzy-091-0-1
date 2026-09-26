/**
 * 环长几何模块。
 *
 * 光纤总长度 L = 2π · R · N
 *
 * 注意：这里必须包含匝数 N。最常见的实现错误是只取一圈周长 2π·R，
 * 那会使标度因数差整整 N 倍（小 N 倍）。正算与反演都从这里取 L，
 * 保证主链路一致。
 */

import type { CoilGeometry } from './types';

/**
 * 计算光纤总长度（m）。
 * 调用方应先用 validation 模块保证几何参数合法。
 */
export function fiberLength(geometry: CoilGeometry): number {
  const { radius, turns } = geometry;
  return 2 * Math.PI * radius * turns;
}
