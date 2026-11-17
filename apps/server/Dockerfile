FROM node:22-alpine
WORKDIR /repo

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json

RUN npm ci --workspace=@inkt/shared --workspace=server --include-workspace-root

COPY packages/shared packages/shared
COPY apps/server apps/server

RUN npm run build -w @inkt/shared

ENV NODE_ENV=production
ENV PORT=2567
EXPOSE 2567

WORKDIR /repo/apps/server
CMD ["npx", "tsx", "src/index.ts"]
