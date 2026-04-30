# syntax=docker/dockerfile:1.7

FROM node:22-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG BUILD_SHA=dev
ENV BUILD_SHA=${BUILD_SHA}
RUN pnpm build

FROM node:22-slim AS prod-deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

FROM node:22-slim AS runtime
WORKDIR /app
ARG BUILD_SHA=dev
ENV BUILD_SHA=${BUILD_SHA}
ENV NODE_ENV=production
ENV PORT=8080
ENV SERVE_CLIENT=1
RUN userdel -r node 2>/dev/null || true && useradd -m -u 1000 -s /bin/bash app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server/index.js"]
