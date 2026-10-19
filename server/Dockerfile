# Build context is the repo root (the server imports ../src/game.ts and ../src/data.ts).
FROM node:22-alpine AS build
WORKDIR /app
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --no-audit --no-fund
COPY src ./src
COPY server ./server
RUN cd server && npm run typecheck && npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app/server
ENV NODE_ENV=production PORT=8787
COPY --from=build /app/server/dist ./dist
COPY --from=build /app/server/node_modules ./node_modules
COPY --from=build /app/server/package.json ./package.json
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8787/health || exit 1
CMD ["node", "dist/index.js"]
