FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./
COPY nx.json tsconfig.base.json jest.config.ts jest.preset.js ./
COPY apps/email-service ./apps/email-service

RUN npm ci
RUN npm run build:email

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist/apps/email-service ./

RUN npm ci --production

EXPOSE 3001

CMD ["node", "main.js"] 