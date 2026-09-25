# ---- 构建阶段：安装依赖并编译 TypeScript ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
COPY test ./test
RUN npm run build

# ---- 运行阶段：保留完整工程，容器内可直接运行测试 ----
FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app /app
EXPOSE 8080
# 容器内运行测试：docker run --rm <image> npm test
CMD ["node", "dist/src/index.js"]
