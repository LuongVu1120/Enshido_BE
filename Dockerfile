# syntax=docker/dockerfile:1

# ── deps: cài dependencies cho toàn workspace (cache layer riêng) ──────────
FROM node:20-alpine AS deps
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/types/package.json packages/types/tsconfig.json packages/types/
COPY packages/types/src packages/types/src
COPY api/package.json api/package.json
RUN npm ci

# ── build: sinh Prisma client + build @enshido/types và api ────────────────
FROM deps AS build
COPY . .
RUN npm run db:generate \
  && npm run build

# ── runner: image production, chỉ copy artefact cần thiết ──────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/types/package.json ./packages/types/package.json
COPY --from=build /app/packages/types/dist ./packages/types/dist
COPY --from=build /app/api/package.json ./api/package.json
COPY --from=build /app/api/dist ./api/dist
COPY --from=build /app/api/prisma ./api/prisma
COPY api/docker-entrypoint.sh ./api/docker-entrypoint.sh
RUN mkdir -p /app/api/uploads /app/data \
  && chmod +x /app/api/docker-entrypoint.sh

WORKDIR /app/api
ENV DATABASE_URL="file:/app/data/enshido.db" \
  API_PORT=4000 \
  STORAGE_DRIVER=disk

EXPOSE 4000
VOLUME ["/app/data", "/app/api/uploads"]

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
