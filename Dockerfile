# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
# No toolchain in this image: better-sqlite3 and sharp ship prebuilt binaries, so skip install
# scripts (otherwise npm tries to compile better-sqlite3 with node-gyp).
RUN npm ci --ignore-scripts
COPY . .
# Baked into the client bundle (Vite exposes VITE_ vars) and shown in Settings.
ARG APP_VERSION=dev
ENV VITE_APP_VERSION=$APP_VERSION
# The build analyses routes and auth refuses to load without a secret; this one is not kept.
RUN BETTER_AUTH_SECRET=build-only npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    DATA_DIR=/data \
    HOST=0.0.0.0 \
    PORT=3000

COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=build /app/build ./build
COPY drizzle ./drizzle
COPY server.js ./

RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
    CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/healthz').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
