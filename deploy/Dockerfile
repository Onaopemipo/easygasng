FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci
COPY apps/web ./apps/web
COPY packages ./packages
COPY database ./database
COPY scripts ./scripts
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production EASYGAS_BACKGROUND_JOBS=false PORT=3000
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 CMD ["node", "--import", "tsx", "scripts/healthcheck.ts"]
CMD ["sh", "-c", "npm run release:check && exec node node_modules/next/dist/bin/next start apps/web --hostname 0.0.0.0 --port 3000"]
