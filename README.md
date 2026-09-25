# fog-sagnac-service

光纤陀螺 Sagnac 干涉相位计算内核。纯 HTTP 后端（无网页界面），根据线圈几何与输入角速度正算相位，并由相位反演角速度。

## 物理模型

- 光纤总长：`L = 2π·R·N`（含匝数 N，不是单圈周长）
- 开环标度因数：`K = 4π·R·L / (λ·c)`，`c = 299 792 458 m/s`（固定常数）
- 正算相位：`Δφ = K·Ω`
- 反演角速度：`Ω̂ = Δφ / K`（可选闭环偏置：反演前扣除 `phaseBias`）
- 模糊判定：`|Δφ| ≥ π/2` 显式告警，`|Δφ| ≥ π` 强告警；相位始终按原值返回，绝不折叠

内置参考配置（`GET /api/reference`）：R = 0.05 m、N = 637、λ = 1550 nm → L ≈ 200.12 m，在地球自转速率 7.2921159e-5 rad/s 下给出约 1.97e-5 rad（微弧度级）的相位，供快速核对量纲与系数。

## 模块划分

| 文件 | 职责 |
| --- | --- |
| `src/constants.ts` | 物理常数与内置参考线圈 |
| `src/geometry.ts` | 环长计算 L = 2π·R·N |
| `src/scale.ts` | 标度因数、相位正算、角速度反演 |
| `src/ambiguity.ts` | π 模糊判定与告警 |
| `src/validate.ts` | 输入校验（带原因的错误） |
| `src/gyro.ts` | 单点主链路编排 |
| `src/scan.ts` | 角速度网格扫描（逐点真算） |
| `src/app.ts` | Fastify 路由 |
| `src/index.ts` | 进程入口 |

## 接口

### `POST /api/phase`

```json
{ "radius": 0.05, "turns": 637, "wavelength": 1550e-9, "omega": 7.2921159e-5 }
```

返回 `fiberLength`、`scaleFactor`、`phase`、`omegaHat`、`inversionResidual`、`ambiguity`。
半径/匝数/波长 ≤ 0 或非法时返回 `400` 与带原因的 `error.reasons`。

### `POST /api/scan`

```json
{ "radius": 0.05, "turns": 637, "wavelength": 1550e-9,
  "grid": { "from": -1e-3, "to": 1e-3, "count": 11 } }
```

或显式给出 `"omegas": [...]`。返回逐点真算的 `{omega, phase, omegaHat, ambiguous, warning}` 序列。

### `GET /api/reference` / `GET /health`

参考配置自检与存活探针。

## 本地运行

```bash
npm ci
npm run build
npm start          # 监听 0.0.0.0:8080（PORT 环境变量可覆盖）
npm test           # 编译并运行全部测试
```

## Docker

```bash
docker build -t fog-sagnac-service .
docker run --rm -p 8080:8080 fog-sagnac-service
docker run --rm fog-sagnac-service npm test   # 容器内运行测试
```

## 快速核对

```bash
curl -s localhost:8080/api/reference | jq .
curl -s -X POST localhost:8080/api/phase -H 'content-type: application/json' \
  -d '{"radius":0.05,"turns":637,"wavelength":1550e-9,"omega":7.2921159e-5}' | jq .
```
