FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 
COPY package*.json ./

# 安装依赖（包括开发依赖，因为构建过程需要 vite 等工具）
RUN npm install

# 复制所有源代码到容器中
COPY . .

# 执行构建命令（编译前端 React 和后端 Express）
RUN npm run build

# 暴露 3000 端口（与我们 server.ts 中监听的端口一致）
EXPOSE 3000

# 启动服务
CMD ["npm", "run", "start"]
