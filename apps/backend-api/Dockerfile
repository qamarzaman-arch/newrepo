# QA D34-D37: hardened backend Dockerfile
#  - multi-stage build so dev/build deps don't ship to prod image
#  - non-root user (node, uid 1000)
#  - tini as PID 1 for proper signal handling / zombie reaping
#  - explicit healthcheck endpoint

FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --include=dev && npx prisma generate

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:20-alpine AS runner
RUN apk add --no-cache tini wget
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

# Drop to the built-in node user (uid 1000); ensure log/archive dirs are writable.
RUN mkdir -p /app/logs /app/audit-archive && chown -R node:node /app
USER node

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.js"]
