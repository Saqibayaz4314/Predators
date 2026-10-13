# Build context must be the repository root:
#   docker build -f app/backend/Dockerfile -t flood-backend .
#
# Monorepo (pnpm workspace): the backend imports @flood/shared, so the
# workspace lockfile and the shared package are part of the build context.

FROM node:22-alpine AS build
WORKDIR /workspace
RUN corepack enable

# Install dependencies first for layer caching.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY app/backend/package.json app/backend/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

# Compile the shared package and the backend.
COPY tsconfig.base.json ./
COPY packages/shared/tsconfig.json packages/shared/tsconfig.json
COPY packages/shared/src packages/shared/src
COPY app/backend/tsconfig.json app/backend/tsconfig.build.json app/backend/
COPY app/backend/src app/backend/src
RUN pnpm --filter @flood/shared build && pnpm --filter @flood/backend build

# Runtime stage: production dependencies only.
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /workspace
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY app/backend/package.json app/backend/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile --prod --filter @flood/backend...

COPY --from=build /workspace/packages/shared/dist packages/shared/dist
COPY --from=build /workspace/app/backend/dist app/backend/dist

WORKDIR /workspace/app/backend
EXPOSE 3001
CMD ["node", "dist/server.js"]
