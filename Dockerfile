FROM node:24-bookworm-slim

WORKDIR /workspace

RUN npm install --global pnpm@10.24.0 && \
    npm cache clean --force

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 5173

CMD ["pnpm", "dev", "--host", "0.0.0.0"]