FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/server/package*.json ./packages/server/
COPY packages/server/prisma ./packages/server/prisma

RUN npm ci --workspace=@bookmark-manager/shared --workspace=@bookmark-manager/server

COPY packages/shared ./packages/shared
COPY packages/server ./packages/server

RUN npm run build -w @bookmark-manager/server


FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/server/package*.json ./packages/server/
COPY packages/server/prisma ./packages/server/prisma

RUN npm ci --workspace=@bookmark-manager/shared --workspace=@bookmark-manager/server --omit=dev

COPY --from=builder /app/packages/server/dist ./packages/server/dist

WORKDIR /app/packages/server

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
