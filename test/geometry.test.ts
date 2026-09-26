import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fiberLength } from '../src/core/geometry';

test('fiberLength: L = 2π·R·N，包含匝数而不是只算一圈周长', () => {
  const L = fiberLength({ radius: 0.1, turns: 100, wavelength: 1550e-9 });
  assert.ok(Math.abs(L - 2 * Math.PI * 0.1 * 100) < 1e-12);
  // 若漏掉 N 只会得到一圈周长 2πR ≈ 0.628 m
  assert.ok(L > 60, 'L 必须包含匝数 N');
});

test('fiberLength: 匝数加倍则总长加倍', () => {
  const a = fiberLength({ radius: 0.1, turns: 100, wavelength: 1550e-9 });
  const b = fiberLength({ radius: 0.1, turns: 200, wavelength: 1550e-9 });
  assert.ok(Math.abs(b / a - 2) < 1e-12);
});

test('fiberLength: 内置参考线圈约两百米（318 圈 / 0.1 m → 199.8 m）', () => {
  const L = fiberLength({ radius: 0.1, turns: 318, wavelength: 1550e-9 });
  assert.ok(L > 199 && L < 201, `参考光纤长度应约 200 m，实际 ${L}`);
});
