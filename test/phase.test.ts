import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluatePhase,
  sagnacPhase,
  scaleFactor,
} from '../src/core/phase';
import { SPEED_OF_LIGHT } from '../src/core/constants';
import {
  EARTH_ROTATION_RATE,
  REFERENCE_COIL,
  referenceSnapshot,
} from '../src/config/reference';
import type { CoilGeometry } from '../src/core/types';

const OMEGA = 1e-3; // rad/s

const base: CoilGeometry = { radius: 0.1, turns: 100, wavelength: 1550e-9 };

test('正算: Δφ = K·Ω = 4π·R·L·Ω/(λ·c)，系数必须包含匝数 N（防漏 N 坑）', () => {
  const { phase, k, length } = sagnacPhase(base, OMEGA);

  // 含匝数的正确 K
  const kExpected =
    (4 * Math.PI * base.radius * length) /
    (base.wavelength * SPEED_OF_LIGHT);
  assert.ok(Math.abs(k - kExpected) < 1e-30);
  assert.ok(Math.abs(phase - kExpected * OMEGA) < 1e-18);

  // 漏掉 N 的“一圈周长”错误标度因数，必须与服务结果差 N 倍
  const oneLoopLength = 2 * Math.PI * base.radius;
  const kWrongNoTurns = scaleFactor(
    base.radius,
    oneLoopLength,
    base.wavelength,
  );
  assert.ok(Math.abs(k / kWrongNoTurns - base.turns) < 1e-12);
  assert.notDeepEqual(k, kWrongNoTurns);
});

test('反号对称: 只把角速度反号，相位严格反号且绝对值不变', () => {
  const pos = sagnacPhase(base, OMEGA);
  const neg = sagnacPhase(base, -OMEGA);

  assert.strictEqual(neg.phase, -pos.phase);
  assert.strictEqual(Math.abs(neg.phase), Math.abs(pos.phase));
  // 标度因数与光纤长度与角速度无关，完全相同
  assert.strictEqual(neg.k, pos.k);
  assert.strictEqual(neg.length, pos.length);
});

test('半径加倍（匝数不变）: 光纤总长加倍，相位变为四倍', () => {
  const doubled: CoilGeometry = { ...base, radius: base.radius * 2 };

  const a = sagnacPhase(base, OMEGA);
  const b = sagnacPhase(doubled, OMEGA);

  assert.ok(
    Math.abs(b.length / a.length - 2) < 1e-12,
    'R 加倍 → L = 2πRN 加倍',
  );
  // K ∝ R·L，R 与 L 同时加倍 → K ×4 → Δφ ×4
  assert.ok(
    Math.abs(b.phase / a.phase - 4) < 1e-12,
    `R 加倍相位应为 4 倍，实际比值 ${b.phase / a.phase}`,
  );
});

test('波长加倍: 相位减半（绝对值），反号情形同样成立', () => {
  const doubledLambda: CoilGeometry = {
    ...base,
    wavelength: base.wavelength * 2,
  };
  const a = sagnacPhase(base, OMEGA);
  const b = sagnacPhase(doubledLambda, OMEGA);
  assert.ok(Math.abs(b.phase / a.phase - 0.5) < 1e-12);

  const aNeg = sagnacPhase(base, -OMEGA);
  const bNeg = sagnacPhase(doubledLambda, -OMEGA);
  assert.ok(Math.abs(bNeg.phase / aNeg.phase - 0.5) < 1e-12);
});

test('匝数加倍: 长度与相位均加倍（与半径加倍的四倍区分开）', () => {
  const moreTurns: CoilGeometry = { ...base, turns: base.turns * 2 };
  const a = sagnacPhase(base, OMEGA);
  const b = sagnacPhase(moreTurns, OMEGA);
  assert.ok(Math.abs(b.length / a.length - 2) < 1e-12);
  assert.ok(Math.abs(b.phase / a.phase - 2) < 1e-12);
});

test('反演: Ω̂ = Δφ / K 精确还原输入角速度（正/负）', () => {
  for (const w of [OMEGA, -OMEGA, 0]) {
    const r = evaluatePhase(base, w);
    assert.ok(Math.abs(r.estimatedOmega - w) < 1e-15);
  }
});

test('闭环薄修正层: 给定 bias 时 Ω̂ = (Δφ - bias)/K，相位本身不变', () => {
  const bias = 1e-6;
  const r = evaluatePhase(base, OMEGA, bias);
  const noBias = evaluatePhase(base, OMEGA);
  assert.strictEqual(r.phase, noBias.phase, 'bias 不改正算相位');
  assert.ok(
    Math.abs(r.estimatedOmega - (r.phase - bias) / r.scaleFactor) < 1e-18,
  );
});

test('相位从不折叠: 大角速度产生超过 π 的原始相位，原值返回并附模糊告警', () => {
  // K ≈ 2.7e-1 s；Ω=20 rad/s 时 Δφ ≈ 5.4 rad
  const r = evaluatePhase(REFERENCE_COIL, 20);
  assert.ok(Math.abs(r.phase) > Math.PI);
  assert.equal(r.ambiguity.warning, true);
  assert.ok(
    r.ambiguity.message?.includes('π'),
    '告警信息必须说明 π 模糊',
  );
});

test('参考配置: 约 200 m 光纤在地球自转量级给出微弧度级可检出相位', () => {
  const snap = referenceSnapshot();
  assert.ok(Math.abs(snap.fiberLength - 199.8053) < 1e-3);
  // 微弧度量级（1e-6 ~ 1e-4 rad）
  assert.ok(
    snap.phase > 1e-6 && snap.phase < 1e-4,
    `地球自转相位应为微弧度级，实际 ${snap.phase} rad`,
  );
  // 理论值 ≈ 3.94e-5 rad ≈ 39.4 μrad，5% 容差
  assert.ok(Math.abs(snap.phaseMicroRadians - 39.4) / 39.4 < 0.05);
  // 该量级远小于 π/2，不应误报模糊
  assert.equal(snap.ambiguity.warning, false);
  // 反演还原地球自转角速度
  assert.ok(
    Math.abs(snap.estimatedOmega - EARTH_ROTATION_RATE) < 1e-15,
  );
});
