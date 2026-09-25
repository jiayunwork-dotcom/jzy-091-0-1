/**
 * 输入校验。
 *
 * 半径、匝数、波长任一不是有限正数即拒绝，并逐条给出原因；
 * 角速度必须是有限数。校验失败时由 HTTP 层返回带原因的 400 JSON。
 */

export interface CoilConfig {
  /** 环半径 R (m) */
  radius: number;
  /** 匝数 N */
  turns: number;
  /** 真空波长 λ (m) */
  wavelength: number;
}

export type ValidationResult =
  | { ok: true; coil: CoilConfig }
  | { ok: false; reasons: string[] };

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** 校验线圈几何与波长参数。 */
export function validateCoil(input: unknown): ValidationResult {
  const reasons: string[] = [];
  const body = (input ?? {}) as Record<string, unknown>;

  const radius = body["radius"];
  const turns = body["turns"];
  const wavelength = body["wavelength"];

  if (!isFiniteNumber(radius)) {
    reasons.push("radius 必须是有限数值（单位 m）");
  } else if (radius <= 0) {
    reasons.push(`radius 必须大于 0（收到 ${radius}）`);
  }

  if (!isFiniteNumber(turns)) {
    reasons.push("turns 必须是有限数值");
  } else if (turns <= 0) {
    reasons.push(`turns 必须大于 0（收到 ${turns}）`);
  }

  if (!isFiniteNumber(wavelength)) {
    reasons.push("wavelength 必须是有限数值（单位 m）");
  } else if (wavelength <= 0) {
    reasons.push(`wavelength 必须大于 0（收到 ${wavelength}）`);
  }

  if (reasons.length > 0) {
    return { ok: false, reasons };
  }
  return {
    ok: true,
    coil: {
      radius: radius as number,
      turns: turns as number,
      wavelength: wavelength as number,
    },
  };
}

/** 校验单个角速度输入 (rad/s)。 */
export function validateOmega(input: unknown): string | null {
  if (!isFiniteNumber(input)) {
    return "omega 必须是有限数值（单位 rad/s）";
  }
  return null;
}

/** 校验可选的闭环偏置（rad）。 */
export function validatePhaseBias(input: unknown): string | null {
  if (input === undefined || input === null) return null;
  if (!isFiniteNumber(input)) {
    return "phaseBias 必须是有限数值（单位 rad）";
  }
  return null;
}
