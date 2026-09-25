/**
 * 线圈几何计算。
 *
 * 光纤总长 L = 2π·R·N。
 * 注意：L 是 N 匝的总长，不是单圈周长 —— 漏掉 N 会让标度因数差 N 倍。
 */

/**
 * 由环半径与匝数计算光纤总长。
 * @param radius 环半径 R (m)
 * @param turns  匝数 N
 * @returns 光纤总长 L (m)
 */
export function fiberLength(radius: number, turns: number): number {
  return 2 * Math.PI * radius * turns;
}
