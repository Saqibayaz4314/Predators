# Build context must be the repository root:
#   docker build -f app/frontend/Dockerfile -t flood-frontend .
#
# Monorepo (pnpm workspace): the frontend imports @flood/shared, so the
# workspace lockfile and the shared package are part of the build context.

FROM node:22-alpine AS build
WORKDIR /workspace
RUN corepack enable

# Install dependencies first for layer caching.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY app/frontend/package.json app/frontend/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

# Compile the shared package and the frontend static bundle.
# VITE_API_BASE_URL defaults to /api/v1 (same-origin through nginx).
COPY tsconfig.base.json ./
COPY packages/shared/tsconfig.json packages/shared/tsconfig.json
COPY packages/shared/src packages/shared/src
COPY app/frontend app/frontend
RUN pnpm --filter @flood/shared build && pnpm --filter @flood/frontend build

# Runtime: nginx serving the static bundle and proxying /api to the backend.
FROM nginx:1.27-alpine AS runtime
COPY app/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/app/frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
