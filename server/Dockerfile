FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
RUN npm install --workspace=server --include-workspace-root
COPY shared ./shared
COPY server ./server
RUN npm run build --workspace=server

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# Run as a non-root user (the node image ships an unprivileged "node" account).
COPY --from=builder --chown=node:node /app/server/dist ./dist
COPY --from=builder --chown=node:node /app/server/package.json ./
COPY --from=builder --chown=node:node /app/server/migrations ./migrations
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
USER node
EXPOSE 4000
# Fail the container if the HTTP server stops answering on /health.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
