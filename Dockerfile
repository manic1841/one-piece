FROM node:24-bookworm-slim

WORKDIR /workspace/one-piece

RUN npm install --global pnpm@10.24.0 && \
    npm cache clean --force

# node_modules 由 host bind mount（..:/workspace）提供，各 worktree 安裝、
# 共用 store。build 時不需再安裝依賴，否則只是塞一份用不到的 node_modules 進 image。
COPY . .

EXPOSE 5173

CMD ["pnpm", "dev", "--host", "0.0.0.0"]
