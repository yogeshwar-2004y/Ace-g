FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 getaway && adduser --system --uid 1001 getaway
COPY --from=builder --chown=getaway:getaway /app/package.json ./package.json
COPY --from=builder --chown=getaway:getaway /app/node_modules ./node_modules
COPY --from=builder --chown=getaway:getaway /app/.next ./.next
COPY --from=builder --chown=getaway:getaway /app/dist ./dist
COPY --from=builder --chown=getaway:getaway /app/public ./public
COPY --from=builder --chown=getaway:getaway /app/next.config.ts ./next.config.ts
USER getaway
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.cjs"]
