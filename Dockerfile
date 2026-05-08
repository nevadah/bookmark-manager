FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
COPY packages/server/prisma ./packages/server/prisma

RUN npm ci --workspace=@bookmark-manager/shared --workspace=@bookmark-manager/server

COPY packages/shared/ ./packages/shared/
COPY packages/server/ ./packages/server/

RUN npm run build -w @bookmark-manager/server


FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
COPY packages/server/prisma ./packages/server/prisma

RUN npm ci --workspace=@bookmark-manager/shared --workspace=@bookmark-manager/server --omit=dev

COPY --from=builder /app/packages/server/dist ./packages/server/dist

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "packages/server/dist/index.js"]
