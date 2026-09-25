/**
 * HTTP 接口测试（Fastify inject，无需真实端口）。
 */

import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/app";

const COIL = { radius: 0.05, turns: 637, wavelength: 1550e-9 };

test("GET /health", async () => {
  const app = buildApp();
  const res = await app.inject({ method: "GET", url: "/health" });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().status, "ok");
  await app.close();
});

test("POST /api/phase 返回相位、标度因数与反演角速度", async () => {
  const app = buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/phase",
    payload: { ...COIL, omega: 7.2921159e-5 },
  });
  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.ok(body.fiberLength > 190 && body.fiberLength < 210);
  assert.ok(body.scaleFactor > 0);
  assert.ok(Math.abs(body.phase) > 1e-6 && Math.abs(body.phase) < 1e-4);
  assert.ok(Math.abs(body.omegaHat - 7.2921159e-5) < 1e-18);
  assert.equal(body.ambiguity.ambiguous, false);
  await app.close();
});

test("POST /api/phase 反号对称（HTTP 层）", async () => {
  const app = buildApp();
  const [pos, neg] = await Promise.all([
    app.inject({ method: "POST", url: "/api/phase", payload: { ...COIL, omega: 1e-4 } }),
    app.inject({ method: "POST", url: "/api/phase", payload: { ...COIL, omega: -1e-4 } }),
  ]);
  assert.equal(pos.json().phase, -neg.json().phase);
  await app.close();
});

test("POST /api/phase 半径取零返回带原因的 400 JSON", async () => {
  const app = buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/phase",
    payload: { radius: 0, turns: 637, wavelength: 1550e-9, omega: 1e-4 },
  });
  assert.equal(res.statusCode, 400);
  const body = res.json();
  assert.equal(body.error.code, "INVALID_INPUT");
  assert.ok(Array.isArray(body.error.reasons));
  assert.ok(body.error.reasons.some((s: string) => s.includes("radius")));
  await app.close();
});

test("POST /api/phase 缺参/非法参均被拒", async () => {
  const app = buildApp();
  for (const payload of [
    { ...COIL }, // 缺 omega
    { ...COIL, omega: "fast" },
    { radius: -0.05, turns: 637, wavelength: 1550e-9, omega: 1e-4 },
    { radius: 0.05, turns: 0, wavelength: 1550e-9, omega: 1e-4 },
    { radius: 0.05, turns: 637, wavelength: -1, omega: 1e-4 },
  ]) {
    const res = await app.inject({ method: "POST", url: "/api/phase", payload });
    assert.equal(res.statusCode, 400, JSON.stringify(payload));
    assert.equal(res.json().error.code, "INVALID_INPUT");
  }
  await app.close();
});

test("POST /api/scan 逐点返回相位序列", async () => {
  const app = buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/scan",
    payload: { ...COIL, grid: { from: -1e-3, to: 1e-3, count: 9 } },
  });
  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.equal(body.points.length, 9);
  assert.equal(body.points[0].omega, -1e-3);
  assert.equal(body.points[8].omega, 1e-3);
  // 逐点真算：与单点接口结果一致
  for (const p of body.points) {
    const single = await app.inject({
      method: "POST",
      url: "/api/phase",
      payload: { ...COIL, omega: p.omega },
    });
    assert.equal(p.phase, single.json().phase);
  }
  await app.close();
});

test("POST /api/scan 支持显式 omegas 数组，非法网格被拒", async () => {
  const app = buildApp();
  const ok = await app.inject({
    method: "POST",
    url: "/api/scan",
    payload: { ...COIL, omegas: [0, 1e-4, -2e-4] },
  });
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.json().points.length, 3);

  const bad = await app.inject({
    method: "POST",
    url: "/api/scan",
    payload: { ...COIL, grid: { from: 0, to: 1, count: 1 } },
  });
  assert.equal(bad.statusCode, 400);
  await app.close();
});

test("GET /api/reference 内置参考配置自检", async () => {
  const app = buildApp();
  const res = await app.inject({ method: "GET", url: "/api/reference" });
  assert.equal(res.statusCode, 200);
  const body = res.json();
  const r = body.result;
  assert.ok(r.fiberLength > 190 && r.fiberLength < 210);
  assert.ok(Math.abs(r.phase) > 1e-6 && Math.abs(r.phase) < 1e-4);
  assert.equal(r.ambiguity.ambiguous, false);
  await app.close();
});

test("同一服务进程内两组配置经 HTTP 调用互不渗透", async () => {
  const app = buildApp();
  const other = { radius: 0.032, turns: 1200, wavelength: 1310e-9 };

  const a1 = (await app.inject({ method: "POST", url: "/api/phase", payload: { ...COIL, omega: 1e-4 } })).json();
  (await app.inject({ method: "POST", url: "/api/phase", payload: { ...other, omega: 1e-4 } })).json();
  const a2 = (await app.inject({ method: "POST", url: "/api/phase", payload: { ...COIL, omega: 1e-4 } })).json();

  assert.deepEqual(a1, a2);
  await app.close();
});
