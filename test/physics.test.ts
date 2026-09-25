/**
 * 几何与标度/相位核心关系测试。
 * 重点：反号对称、半径加倍 → 相位四倍、波长加倍 → 相位减半、反演自洽。
 */

import assert from "node:assert/strict";
import test from "node:test";
import { C_LIGHT, EARTH_ROTATION_RATE, REFERENCE_COIL } from "../src/constants";
import { fiberLength } from "../src/geometry";
import { computeGyro } from "../src/gyro";
import { omegaFromPhase, phaseFromOmega, scaleFactor } from "../src/scale";

const COIL = { radius: 0.05, turns: 637, wavelength: 1550e-9 };
const TOL = 1e-12;

test("光纤总长 L = 2π·R·N（含匝数，不是单圈周长）", () => {
  const L = fiberLength(0.05, 637);
  assert.ok(Math.abs(L - 2 * Math.PI * 0.05 * 637) < 1e-12);
  // 若漏掉匝数，L 会等于单圈周长 —— 明确排除这个错误
  assert.ok(Math.abs(L - 2 * Math.PI * 0.05) > 1);
});

test("反号对称：只把角速度反号，相位反号且绝对值不变", () => {
  const omega = 1.3e-4;
  const pos = computeGyro(COIL, omega);
  const neg = computeGyro(COIL, -omega);
  assert.equal(pos.phase, -neg.phase);
  assert.equal(Math.abs(pos.phase), Math.abs(neg.phase));
  assert.equal(pos.scaleFactor, neg.scaleFactor);
  assert.equal(pos.fiberLength, neg.fiberLength);
});

test("半径加倍（匝数不变）：光纤总长加倍，相位变为四倍", () => {
  const omega = 7.5e-5;
  const base = computeGyro(COIL, omega);
  const doubled = computeGyro({ ...COIL, radius: COIL.radius * 2 }, omega);

  assert.ok(Math.abs(doubled.fiberLength / base.fiberLength - 2) < TOL);
  assert.ok(Math.abs(doubled.phase / base.phase - 4) < 1e-9);
  assert.ok(Math.abs(doubled.scaleFactor / base.scaleFactor - 4) < 1e-9);
});

test("波长加倍：相位减半", () => {
  const omega = 2.0e-4;
  const base = computeGyro(COIL, omega);
  const doubled = computeGyro({ ...COIL, wavelength: COIL.wavelength * 2 }, omega);
  assert.ok(Math.abs(doubled.phase / base.phase - 0.5) < 1e-12);
});

test("正算与反演互逆：Ω̂ = Δφ/K 还原输入角速度", () => {
  const omega = -3.21e-4;
  const r = computeGyro(COIL, omega);
  assert.ok(Math.abs(r.omegaHat - omega) < 1e-18);
  assert.ok(Math.abs(r.inversionResidual) < 1e-18);

  // 底层函数级互逆
  const K = scaleFactor(COIL.radius, fiberLength(COIL.radius, COIL.turns), COIL.wavelength);
  assert.equal(omegaFromPhase(phaseFromOmega(K, omega), K), omega);
});

test("标度因数显式公式核对：K = 4π·R·L / (λ·c)", () => {
  const L = fiberLength(COIL.radius, COIL.turns);
  const expected = (4 * Math.PI * COIL.radius * L) / (COIL.wavelength * C_LIGHT);
  const r = computeGyro(COIL, 1e-4);
  assert.ok(Math.abs(r.scaleFactor - expected) < 1e-15);
});

test("内置参考配置：~200 m 光纤，地球自转下给出微弧度级相位", () => {
  const r = computeGyro(REFERENCE_COIL, EARTH_ROTATION_RATE);
  // 光纤总长约 200 m
  assert.ok(r.fiberLength > 190 && r.fiberLength < 210, `L = ${r.fiberLength}`);
  // 相位为微弧度量级（1e-6 ~ 1e-4 rad），且不为零（可被检出）
  assert.ok(Math.abs(r.phase) > 1e-6 && Math.abs(r.phase) < 1e-4, `phase = ${r.phase}`);
  // 地球自转量级下不应触发模糊告警
  assert.equal(r.ambiguity.ambiguous, false);
  assert.equal(r.ambiguity.warning, null);
});

test("闭环偏置薄层：反演前扣除 bias，正算相位不受影响", () => {
  const omega = 1e-4;
  const bias = 1e-6;
  const open = computeGyro(COIL, omega);
  const closed = computeGyro(COIL, omega, bias);
  assert.equal(closed.phase, open.phase);
  assert.ok(Math.abs(closed.omegaHat - (omega - bias / open.scaleFactor)) < 1e-18);
});
