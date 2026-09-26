# 光纤陀螺 Sagnac 干涉相位计算服务

纯干涉陀螺计算内核：给定线圈几何（R、N、λ）与输入角速度 Ω，还原 Sagnac
干涉相位 Δφ；反过来由测得相位标定角速度 Ω̂。仅通过 HTTP 提供 JSON 接口，
无网页界面，不含罗盘/航迹显示，也不做惯导误差状态滤波。

- 运行时：Node.js 20 + TypeScript（编译为可直接执行的 CommonJS 产物）
- HTTP：Fastify，容器启动后固定监听 **8080** 端口
- 测试：`node:test` 内置测试运行器，可在容器内执行

## 物理模型

```
L   = 2π · R · N                       光纤总长度（含匝数 N）
Δφ  = 4π · R · L · Ω / (λ · c)         Sagnac 相位差
K   = 4π · R · L / (λ · c)             开环标度因数
Ω̂  = (Δφ − bias) / K                   由相位反推角速度
c   = 299 792 458 m/s                  真空光速（固定常数）
```

**最容易踩的坑**：L 必须是含匝数的光纤总长 `2π·R·N`，不能只取一圈周长
`2π·R`，否则标度因数会差整整 N 倍。所有正算与反演统一经 `geometry` 模块取 L，
并有专门测试锁死这一点。

开环相位以 2π 为周期，|Δφ| 接近 π 时存在测量模糊。服务**绝不折叠相位**，
而是在响应中显式给出 `ambiguity.warning` 与中文原因：

- `|Δφ| ≥ π/2`（默认阈值）：进入模糊区告警；
- `|Δφ| ≥ π`：整周缠绕，角速度无法唯一确定。

闭环偏置修正只做很薄的一层：`bias` 为可选输入，仅作用于反演，不改变正算相位。

## 内置参考配置

R = 0.1 m、N = 318 圈 → **L ≈ 199.8 m**（约两百米光纤），λ = 1550 nm。
在地球自转角速度 7.292115e-5 rad/s 下：

```
Δφ ≈ 3.94e-5 rad ≈ 39.4 μrad（可检出的微弧度级信号）
```

`GET /api/reference` 可随时核对量纲与系数。

## 快速开始

```bash
npm install
npm run build      # tsc -> dist/
npm start          # 监听 0.0.0.0:8080
npm test           # 编译并运行全部测试
```

### Docker

```bash
docker build -t fog-sagnac .
docker run --rm -p 8080:8080 fog-sagnac
# 容器内运行测试：
docker run --rm fog-sagnac sh -c "npm test"
```

## HTTP 接口

### `GET /health`
存活探针 → `{"status":"ok","service":"fog-sagnac"}`

### `GET /api/reference`
内置约 200 m 线圈在地球自转量级下的核对快照（含 `phaseMicroRadians`）。

### `POST /api/phase` — 单点正算 + 反演

请求：
```json
{ "radius": 0.1, "turns": 100, "wavelength": 1.55e-6, "omega": 0.01, "bias": 0 }
```
（`bias` 可选，单位 rad；`omega` 允许为负）

响应：
```json
{
  "geometry": { "radius": 0.1, "turns": 100, "wavelength": 0.00000155 },
  "input": { "omega": 0.01, "bias": 0 },
  "fiberLength": 62.83185307179586,
  "scaleFactor": 0.16991719545873915,
  "phase": 0.0016991719545873915,
  "estimatedOmega": 0.01,
  "ambiguity": { "warning": false, "message": null, "ratioToPi": 0.0005408632314714018 }
}
```

### `POST /api/sweep` — 角速度网格扫描

请求：
```json
{ "radius": 0.1, "turns": 318, "wavelength": 1.55e-6,
  "omegas": [0, -7.292115e-5, 7.292115e-5, 3, 8] }
```
响应携带 `fiberLength / scaleFactor / count / points[]`，**每个点独立真算**
（正算 → 反演 → 模糊判定），测试会逐点与 `/api/phase` 单点调用比对，
不允许用一条过原点的直线糊弄。

### 错误响应

R / N / λ 任一 ≤ 0、非有限数或缺失，返回 HTTP 400 及逐字段原因：

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "线圈几何参数校验失败",
    "details": { "radius": "光纤环半径 R必须严格大于 0，收到：0" }
  }
}
```

## 已锁定的交叉关系（测试）

| 关系 | 期望 |
| --- | --- |
| Ω → −Ω | Δφ → −Δφ，绝对值不变（反号对称，重点测试） |
| R → 2R（N 不变） | L → 2L，Δφ → 4Δφ（半径加倍，重点测试） |
| λ → 2λ | Δφ → Δφ/2 |
| N → 2N | L → 2L，Δφ → 2Δφ |
| R = 0 | 400 + 带原因错误 JSON |
| 漏掉匝数只取 2πR | K 差 N 倍，测试显式拦截 |

此外还包含：反演精确还原 Ω（含 0 与负值）、bias 仅影响反演、相位从不折叠、
扫描逐点一致、两组不同线圈配置在同一进程并发下结果隔离。

## 模块划分

```
src/
  index.ts              启动入口（固定 8080 端口、优雅关闭）
  app.ts                Fastify 装配 / 统一错误处理
  config/reference.ts   约 200 m 参考线圈 + 地球自转角速度
  core/
    constants.ts        真空光速等常量
    types.ts            共享类型
    geometry.ts         环长 L = 2π·R·N（独立）
    phase.ts            相位正算 / K / 反演（独立）
    ambiguity.ts        开环模糊判定，只告警不折叠（独立）
    validation.ts       输入校验，带字段原因（独立）
    sweep.ts            角速度网格逐点扫描（独立）
  routes/
    phase.ts            POST /api/phase
    sweep.ts            POST /api/sweep
    reference.ts        GET /api/reference
test/
  geometry / phase / validation / sweep / api 五组自动化测试
```

计算全部为无状态纯函数，线圈配置随请求传入、不在进程内共享可变状态，
因此两组配置的计算天然隔离。
