# 光纤陀螺 Sagnac 计算内核 —— 固定 Node.js 20 运行时
FROM node:20-bookworm-slim

WORKDIR /app

# 先装依赖，充分利用构建缓存
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# 拷贝 TypeScript 源码与工程配置
COPY tsconfig.build.json tsconfig.test.json ./
COPY src ./src
COPY test ./test

# 编译成可直接执行的产物
RUN npm run build

ENV NODE_ENV=production
EXPOSE 8080

# 容器启动后监听固定端口 8080
CMD ["node", "dist/index.js"]
