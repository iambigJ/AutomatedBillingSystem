FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./
COPY nx.json tsconfig.base.json jest.config.ts jest.preset.js ./
COPY apps/invoice-service ./apps/invoice-service

RUN npm ci
RUN npm run build:invoice

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist/apps/invoice-service ./
COPY --from=builder /app/apps/invoice-service/config.yaml ./

RUN npm ci --production

EXPOSE 3000

CMD ["node", "main.js"] 