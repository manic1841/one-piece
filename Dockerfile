FROM node:24-bookworm-slim

WORKDIR /workspace/one-piece

RUN npm install --global pnpm@10.24.0 && \
    npm cache clean --force

# graphify：本機知識圖 CLI，`.claude/settings.json` 的 hooks 與 `AGENTS.md`
# 的 Codebase graph 規則都指向它。裝進 /usr/local/bin 讓每個 shell 都找得到。
# 版本與 `.agents/skills/graphify/.graphify_version` 一起升。
ENV UV_INSTALL_DIR=/usr/local/bin \
    UV_TOOL_BIN_DIR=/usr/local/bin
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl ca-certificates git && \
    curl -LsSf https://astral.sh/uv/install.sh | sh && \
    uv tool install --python 3.12 graphifyy==0.9.115 && \
    rm -rf /var/lib/apt/lists/* /root/.cache/uv

# node_modules 由 host bind mount（..:/workspace）提供，各 worktree 安裝、
# 共用 store。build 時不需再安裝依賴，否則只是塞一份用不到的 node_modules 進 image。
COPY . .

EXPOSE 5173

CMD ["pnpm", "dev", "--host", "0.0.0.0"]
