/**
 * 输入校验与模糊判定测试。
 */

import assert from "node:assert/strict";
import test from "node:test";
import { assessAmbiguity } from "../src/ambiguity";
import { computeGyro } from "../src/gyro";
import { validateCoil, validateOmega } from "../src/validate";

const COIL = { radius: 0.05, turns: 637, wavelength: 1550e-9 };

test("半径取零被拒绝并给出原因", () => {
  const r = validateCoil({ radius: 0, turns: 637, wavelength: 1550e-9 });
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.reasons.some((s) => s.includes("radius")));
});

test("半径、匝数、波长任一小于等于零均被拒绝", () => {
  for (const bad of [
    { radius: -1, turns: 637, wavelength: 1550e-9 },
    { radius: 0.05, turns: 0, wavelength: 1550e-9 },
    { radius: 0.05, turns: -10, wavelength: 1550e-9 },
    { radius: 0.05, turns: 637, wavelength: 0 },
    { radius: 0.05, turns: 637, wavelength: -1550e-9 },
  ]) {
    assert.equal(validateCoil(bad).ok, false, JSON.stringify(bad));
  }
});

test("非数值 / NaN / 无穷被拒绝", () => {
  for (const bad of [
    { radius: NaN, turns: 637, wavelength: 1550e-9 },
    { radius: 0.05, turns: Infinity, wavelength: 1550e-9 },
    { radius: 0.05, turns: 637, wavelength: "1550nm" },
    {},
  ]) {
    assert.equal(validateCoil(bad).ok, false, JSON.stringify(bad));
  }
});

test("合法配置通过校验", () => {
  const r = validateCoil(COIL);
  assert.equal(r.ok, true);
});

test("角速度校验：有限数通过，其余拒绝", () => {
  assert.equal(validateOmega(0), null);
  assert.equal(validateOmega(-7.29e-5), null);
  assert.ok(validateOmega(NaN) !== null);
  assert.ok(validateOmega(undefined) !== null);
  assert.ok(validateOmega("1e-4") !== null);
});

test("模糊判定：小相位无告警，接近 π 显式告警，超过 π 强告警", () => {
  const small = assessAmbiguity(1e-5);
  assert.equal(small.ambiguous, false);
  assert.equal(small.warning, null);

  const near = assessAmbiguity(Math.PI * 0.75);
  assert.equal(near.ambiguous, true);
  assert.equal(near.exceedsUnambiguousRange, false);
  assert.ok(near.warning !== null && near.warning.includes("模糊"));

  const beyond = assessAmbiguity(Math.PI * 1.2);
  assert.equal(beyond.ambiguous, true);
  assert.equal(beyond.exceedsUnambiguousRange, true);
  assert.ok(beyond.warning !== null && beyond.warning.includes("未做折叠"));
});

test("接近 π 时服务显式告警，且相位保持原值不折叠", () => {
  // 构造一个使 |Δφ| 接近 π 的角速度
  const probe = computeGyro(COIL, 1e-6);
  const omegaAtPi = Math.PI / probe.scaleFactor;
  const r = computeGyro(COIL, omegaAtPi * 0.95);

  assert.ok(Math.abs(r.phase) > Math.PI / 2);
  assert.equal(r.ambiguity.ambiguous, true);
  assert.ok(r.ambiguity.warning !== null);
  // 相位按原值返回（约 0.95π），绝不折叠到主值区间
  assert.ok(Math.abs(r.phase - 0.95 * Math.PI) < 1e-6);
  // 反演值仍按原相位计算（可能不可靠，但绝不静默折叠）
  assert.ok(Math.abs(r.omegaHat - omegaAtPi * 0.95) < 1e-12);
});
