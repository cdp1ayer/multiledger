FROM node:20-slim

# 安装编译依赖 (以防 better-sqlite3 需要现场编译)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 只复制 package.json，不复制 package-lock.json
# 这样可以避免跨平台 (Windows/Mac -> Linux) 导致的 Tailwind/esbuild 原生依赖丢失问题
COPY package.json ./

# 安装依赖
RUN npm install

# 复制所有源代码到容器中
COPY . .

# 执行构建命令（编译前端 React 和后端 Express）
RUN npm run build

# 设置生产环境变量，确保后端以生产模式运行（不启动 Vite 中间件）
ENV NODE_ENV=production

# 暴露 3000 端口
EXPOSE 3000

# 启动服务
CMD ["npm", "run", "start"]
