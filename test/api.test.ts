import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app';
import type { FastifyInstance } from 'fastify';

const app: FastifyInstance = buildApp();
after(async () => {
  await app.close();
});

test('GET /health 返回存活状态', async () => {
  const res = await app.inject({ method: 'GET', url: '/health' });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), { status: 'ok', service: 'fog-sagnac' });
});

test('GET /api/reference 给出微弧度级地球自转核对值', async () => {
  const res = await app.inject({ method: 'GET', url: '/api/reference' });
  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.ok(body.fiberLength > 199 && body.fiberLength < 201);
  assert.ok(body.phaseMicroRadians > 30 && body.phaseMicroRadians < 50);
  assert.equal(body.ambiguity.warning, false);
});

test('POST /api/phase 主链路: 返回 L、K、Δφ 与反演 Ω̂', async () => {
  const payload = { radius: 0.1, turns: 100, wavelength: 1550e-9, omega: 0.01 };
  const res = await app.inject({ method: 'POST', url: '/api/phase', payload });
  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.ok(Math.abs(body.fiberLength - 2 * Math.PI * 0.1 * 100) < 1e-9);
  assert.ok(body.scaleFactor > 0);
  assert.ok(Math.abs(body.phase - body.scaleFactor * 0.01) < 1e-18);
  assert.ok(Math.abs(body.estimatedOmega - 0.01) < 1e-15);
  assert.equal(body.ambiguity.warning, false);
});

test('POST /api/phase: 大角速度返回原始未折叠相位并显式模糊告警', async () => {
  const payload = { radius: 0.1, turns: 318, wavelength: 1550e-9, omega: 20 };
  const res = await app.inject({ method: 'POST', url: '/api/phase', payload });
  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.ok(Math.abs(body.phase) > Math.PI, '相位必须保持原始、未折叠');
  assert.equal(body.ambiguity.warning, true);
  assert.ok(typeof body.ambiguity.message === 'string');
});

test('POST /api/phase: R=0 返回 400 带原因的错误 JSON', async () => {
  const payload = { radius: 0, turns: 100, wavelength: 1550e-9, omega: 1 };
  const res = await app.inject({ method: 'POST', url: '/api/phase', payload });
  assert.equal(res.statusCode, 400);
  const body = res.json();
  assert.equal(body.error.code, 'INVALID_INPUT');
  assert.match(body.error.details.radius, /大于 0/);
});

test('POST /api/phase: N、λ 非法分别在对应字段给出原因', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/phase',
    payload: { radius: 0.1, turns: -2, wavelength: 0, omega: 1 },
  });
  assert.equal(res.statusCode, 400);
  const details = res.json().error.details;
  assert.match(details.turns, /大于 0/);
  assert.match(details.wavelength, /大于 0/);
});

test('POST /api/phase: 非法 JSON 返回 400 错误 JSON', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/phase',
    headers: { 'content-type': 'application/json' },
    payload: '{ not json',
  });
  assert.equal(res.statusCode, 400);
  assert.equal(res.json().error.code, 'FST_ERR_CTP_INVALID_JSON_BODY');
});

test('POST /api/sweep: 逐点采样与逐次单点调用完全一致', async () => {
  const omegas = [-0.2, -0.01, 0, 0.05, 0.3];
  const payload = { radius: 0.08, turns: 222, wavelength: 1310e-9, omegas };
  const res = await app.inject({ method: 'POST', url: '/api/sweep', payload });
  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.equal(body.count, 5);

  for (const [i, omega] of omegas.entries()) {
    const single = await app.inject({
      method: 'POST',
      url: '/api/phase',
      payload: { radius: 0.08, turns: 222, wavelength: 1310e-9, omega },
    });
    const s = single.json();
    const p = body.points[i];
    assert.strictEqual(p.phase, s.phase, `第 ${i} 点相位必须逐点真算`);
    assert.strictEqual(p.estimatedOmega, s.estimatedOmega);
    assert.strictEqual(p.ambiguity.warning, s.ambiguity.warning);
  }
});

test('POST /api/sweep: 空网格返回 400', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/sweep',
    payload: { radius: 0.1, turns: 100, wavelength: 1550e-9, omegas: [] },
  });
  assert.equal(res.statusCode, 400);
  assert.match(res.json().error.details.omegas, /不能为空/);
});

test('配置隔离: 同一进程内两组不同线圈配置的结果互不渗透', async () => {
  // 线圈 A 与线圈 B 几何不同，在相同角速度序列下交替请求，
  // 每次结果都必须只由本次请求携带的几何决定。
  const coilA = { radius: 0.1, turns: 100, wavelength: 1550e-9 };
  const coilB = { radius: 0.2, turns: 200, wavelength: 1310e-9 };

  for (let round = 0; round < 3; round++) {
    const [a1, b1, a2, b2] = await Promise.all([
      app.inject({ method: 'POST', url: '/api/phase', payload: { ...coilA, omega: 0.01 } }),
      app.inject({ method: 'POST', url: '/api/phase', payload: { ...coilB, omega: 0.01 } }),
      app.inject({ method: 'POST', url: '/api/phase', payload: { ...coilA, omega: 0.01 } }),
      app.inject({ method: 'POST', url: '/api/phase', payload: { ...coilB, omega: 0.01 } }),
    ]);

    const [ja1, jb1, ja2, jb2] = [a1.json(), b1.json(), a2.json(), b2.json()];

    // A 的两次响应完全一致
    assert.strictEqual(ja1.phase, ja2.phase);
    assert.strictEqual(jb1.phase, jb2.phase);
    // A 与 B 各自的 L、K 不相同且只取决于自身几何
    const expectedLA = 2 * Math.PI * coilA.radius * coilA.turns;
    const expectedLB = 2 * Math.PI * coilB.radius * coilB.turns;
    assert.ok(Math.abs(ja1.fiberLength - expectedLA) < 1e-12);
    assert.ok(Math.abs(jb1.fiberLength - expectedLB) < 1e-12);
    assert.notEqual(ja1.scaleFactor, jb1.scaleFactor);

    // 直接用 B 几何核算 B 的相位，确认没有被 A 污染
    const expectedKb =
      (4 * Math.PI * coilB.radius * expectedLB) /
      (coilB.wavelength * 299792458);
    assert.ok(Math.abs(jb1.phase - expectedKb * 0.01) < 1e-18);
  }
});

test('未知路径返回 404 JSON', async () => {
  const res = await app.inject({ method: 'GET', url: '/nope' });
  assert.equal(res.statusCode, 404);
  assert.equal(res.json().error.code, 'NOT_FOUND');
});
