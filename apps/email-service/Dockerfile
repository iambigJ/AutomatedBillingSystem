FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./
COPY nx.json tsconfig.base.json jest.config.ts jest.preset.js ./
COPY apps/email-service ./apps/email-service
COPY libs/common ./libs/common

RUN npm ci
RUN npm run build:email
RUN npx nx build common

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist/apps/email-service ./
COPY --from=builder /app/dist/libs/common ./node_modules/@carearra/common

RUN npm ci --production

EXPOSE 3001

CMD ["node", "main.js"] 