import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessAmbiguity } from '../src/core/ambiguity';
import { ValidationError, validateGeometry } from '../src/core/validation';

test('模糊判定: 微弧度级相位无告警', () => {
  const r = assessAmbiguity(4e-5);
  assert.equal(r.warning, false);
  assert.equal(r.message, null);
});

test('模糊判定: 零相位无告警', () => {
  assert.equal(assessAmbiguity(0).warning, false);
});

test('模糊判定: |Δφ| ≥ π/2 显式告警，负值只看绝对值', () => {
  const near = assessAmbiguity(Math.PI * 0.8);
  assert.equal(near.warning, true);
  assert.ok(near.message?.includes('模糊'));

  const nearNeg = assessAmbiguity(-Math.PI * 0.8);
  assert.equal(nearNeg.warning, true);
  assert.ok(Math.abs(nearNeg.ratioToPi - near.ratioToPi) < 1e-15);
});

test('模糊判定: |Δφ| ≥ π 标记整周缠绕', () => {
  const over = assessAmbiguity(1.5 * Math.PI);
  assert.equal(over.warning, true);
  assert.ok(over.message?.includes('缠绕'));
  assert.ok(over.ratioToPi >= 1);
});

test('模糊判定: 恰在 π/2 阈值上触发（边界含等号）', () => {
  assert.equal(assessAmbiguity(Math.PI / 2).warning, true);
  assert.equal(assessAmbiguity(Math.PI / 2 - 1e-12).warning, false);
});

test('校验: 合法几何通过', () => {
  const g = validateGeometry({ radius: 0.1, turns: 100, wavelength: 1550e-9 });
  assert.deepEqual(g, { radius: 0.1, turns: 100, wavelength: 1550e-9 });
});

test('校验: R = 0 被拒并给出原因', () => {
  assert.throws(
    () => validateGeometry({ radius: 0, turns: 100, wavelength: 1550e-9 }),
    (err: unknown) => {
      assert.ok(err instanceof ValidationError);
      assert.match(err.details.radius!, /大于 0/);
      return true;
    },
  );
});

test('校验: 负半径被拒', () => {
  assert.throws(
    () => validateGeometry({ radius: -0.1, turns: 100, wavelength: 1550e-9 }),
    (err: unknown) => err instanceof ValidationError,
  );
});

test('校验: N ≤ 0 被拒并给出原因', () => {
  for (const turns of [0, -5]) {
    assert.throws(
      () => validateGeometry({ radius: 0.1, turns, wavelength: 1550e-9 }),
      (err: unknown) => {
        assert.ok(err instanceof ValidationError);
        assert.match(err.details.turns!, /大于 0/);
        return true;
      },
    );
  }
});

test('校验: λ ≤ 0 被拒并给出原因', () => {
  for (const wavelength of [0, -1e-9]) {
    assert.throws(
      () => validateGeometry({ radius: 0.1, turns: 100, wavelength }),
      (err: unknown) => {
        assert.ok(err instanceof ValidationError);
        assert.match(err.details.wavelength!, /大于 0/);
        return true;
      },
    );
  }
});

test('校验: 非数值 / NaN / Infinity / 缺字段 全部拒绝且带字段原因', () => {
  const badInputs = [
    { radius: '0.1', turns: 100, wavelength: 1550e-9 },
    { radius: 0.1, turns: NaN, wavelength: 1550e-9 },
    { radius: 0.1, turns: 100, wavelength: Infinity },
    { turns: 100, wavelength: 1550e-9 },
    null,
    'nope',
  ];
  for (const raw of badInputs) {
    assert.throws(
      () => validateGeometry(raw),
      (err: unknown) => err instanceof ValidationError,
      `应拒绝 ${JSON.stringify(raw)}`,
    );
  }
});
