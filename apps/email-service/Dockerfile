FROM node:20-alpine as builder

WORKDIR /app

# Copy package files and install dependencies first (for better caching)
COPY package*.json ./
COPY nx.json tsconfig.base.json jest.config.ts jest.preset.js ./

# Copy the application and common library source code
COPY apps/email-service ./apps/email-service
COPY libs/common ./libs/common

# Install all dependencies
RUN npm ci

# Build the email service and common library
RUN npm run build:email
RUN npx nx build common

# Second stage: create the production image
FROM node:20-alpine

# Create directory structure that matches expected config path
WORKDIR /app
RUN mkdir -p /apps/
RUN mkdir -p /apps/libs/

# Set environment variable to help locate config.yaml
ENV APP_NAME=email-service

# Copy built files from builder stage
COPY --from=builder /app/dist/apps/email-service /apps/
COPY --from=builder /app/dist/libs/common /apps/libs/

# Copy config.yaml to the expected location for the GlobalConfigModule
COPY --from=builder /app/apps/email-service/config.yaml /app/apps/email-service/config.yaml

# Create symlinks to make modules accessible
RUN mkdir -p /app/node_modules/@mytest
RUN ln -s /apps/libs/common /app/node_modules/@mytest/common

# Install production dependencies only
RUN npm ci --production

EXPOSE 3001

# Start the application 
CMD ["node", "/apps/email-service/main.js"] 