/**
 * 扫描与配置隔离测试。
 */

import assert from "node:assert/strict";
import test from "node:test";
import { computeGyro } from "../src/gyro";
import { omegaGrid, scanOmegas } from "../src/scan";

const COIL_A = { radius: 0.05, turns: 637, wavelength: 1550e-9 };
const COIL_B = { radius: 0.032, turns: 1200, wavelength: 1310e-9 };

test("扫描序列逐点真算：每个点与独立单点计算完全一致", () => {
  const omegas = omegaGrid(-1e-3, 1e-3, 11);
  const scan = scanOmegas(COIL_A, omegas);

  assert.equal(scan.points.length, 11);
  for (const p of scan.points) {
    const independent = computeGyro(COIL_A, p.omega);
    assert.equal(p.phase, independent.phase);
    assert.equal(p.omegaHat, independent.omegaHat);
  }
});

test("扫描网格生成：端点准确、等间距", () => {
  const g = omegaGrid(-1, 1, 5);
  assert.deepEqual(g, [-1, -0.5, 0, 0.5, 1]);
});

test("同一进程内两组线圈配置各自隔离、互不渗透", () => {
  const omega = 2.5e-4;

  // 先各自独立计算
  const soloA = computeGyro(COIL_A, omega);
  const soloB = computeGyro(COIL_B, omega);

  // 再交错计算多次，结果必须与独立计算逐比特一致
  for (let i = 0; i < 5; i++) {
    const a = computeGyro(COIL_A, omega);
    const b = computeGyro(COIL_B, omega);
    assert.deepEqual(a, soloA);
    assert.deepEqual(b, soloB);
  }

  // 两组配置的标度因数确实不同（隔离测试有意义的前提）
  assert.notEqual(soloA.scaleFactor, soloB.scaleFactor);

  // 交错扫描也不串扰
  const omegas = [-1e-4, 0, 1e-4];
  const scanA = scanOmegas(COIL_A, omegas);
  const scanB = scanOmegas(COIL_B, omegas);
  for (let i = 0; i < omegas.length; i++) {
    assert.equal(scanA.points[i]!.phase, computeGyro(COIL_A, omegas[i]!).phase);
    assert.equal(scanB.points[i]!.phase, computeGyro(COIL_B, omegas[i]!).phase);
  }
});

test("扫描中的模糊点被逐点标记", () => {
  const probe = computeGyro(COIL_A, 1e-6);
  const omegaAtPi = Math.PI / probe.scaleFactor;
  const omegas = [omegaAtPi * 0.1, omegaAtPi * 0.9];
  const scan = scanOmegas(COIL_A, omegas);

  assert.equal(scan.points[0]!.ambiguous, false);
  assert.equal(scan.points[0]!.warning, null);
  assert.equal(scan.points[1]!.ambiguous, true);
  assert.ok(scan.points[1]!.warning !== null);
});
