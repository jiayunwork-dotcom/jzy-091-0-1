import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sweepOmega } from '../src/core/sweep';
import { sagnacPhase, evaluatePhase } from '../src/core/phase';
import { ValidationError, validateOmegaGrid } from '../src/core/validation';
import type { CoilGeometry } from '../src/core/types';

const g: CoilGeometry = { radius: 0.1, turns: 64, wavelength: 1550e-9 };

test('扫描: 逐点真算——每个点都与单点正算/反演完全一致（非直线糊弄）', () => {
  // 刻意取非均匀、含负值与零的网格：若用线性插值糊弄极易暴露
  const omegas = [-0.5, -0.123, 0, 0.07, 0.333, 1.25];
  const result = sweepOmega(g, omegas);

  assert.equal(result.count, omegas.length);
  result.points.forEach((point, i) => {
    const expected = sagnacPhase(g, omegas[i]!);
    // 相位逐点严格相等（同一个正算函数、同样输入）
    assert.strictEqual(point.phase, expected.phase);
    assert.strictEqual(point.omega, omegas[i]);
    // 反演也逐点成立
    const single = evaluatePhase(g, omegas[i]!);
    assert.strictEqual(point.estimatedOmega, single.estimatedOmega);
    assert.strictEqual(point.ambiguity.warning, single.ambiguity.warning);
  });
});

test('扫描: 大角速度点单独触发模糊告警，小角速度点不告警', () => {
  const referenceCoil: CoilGeometry = {
    radius: 0.1,
    turns: 318,
    wavelength: 1550e-9,
  };
  // K ≈ 0.54 s，Ω=8 rad/s -> |Δφ|≈4.3 > π；Ω=1e-4 -> 54 μrad
  const result = sweepOmega(referenceCoil, [0, 1e-4, 8, -8]);
  assert.equal(result.points[0]!.ambiguity.warning, false);
  assert.equal(result.points[1]!.ambiguity.warning, false);
  assert.equal(result.points[2]!.ambiguity.warning, true);
  assert.equal(result.points[3]!.ambiguity.warning, true);
});

test('扫描: bias 只影响各点反演值，不影响相位', () => {
  const omegas = [0, 0.1, 0.2];
  const plain = sweepOmega(g, omegas);
  const biased = sweepOmega(g, omegas, 1e-6);
  plain.points.forEach((p, i) => {
    assert.strictEqual(p.phase, biased.points[i]!.phase);
    assert.ok(
      Math.abs(
        biased.points[i]!.estimatedOmega -
          (p.phase - 1e-6) / plain.scaleFactor,
      ) < 1e-18,
    );
  });
});

test('扫描: 网格校验——非数组 / 空网格 / 含非法元素 均被拒', () => {
  assert.throws(() => validateOmegaGrid(null), ValidationError);
  assert.throws(() => validateOmegaGrid([]), ValidationError);
  assert.throws(() => validateOmegaGrid([1, 'x', 3]), ValidationError);
  assert.throws(() => validateOmegaGrid([1, NaN]), ValidationError);
});

test('扫描: 合法网格通过且保持输入顺序', () => {
  const omegas = validateOmegaGrid([3, -1, 0, 2.5]);
  assert.deepEqual(omegas, [3, -1, 0, 2.5]);
});
