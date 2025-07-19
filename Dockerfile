# Multi-stage build for ALMUS Todo List
FROM node:18-alpine AS base

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Web App Build
FROM base AS web-app-builder
WORKDIR /app/apps/web-app
COPY apps/web-app/package.json ./
COPY apps/web-app/ ./
RUN yarn build

# Mobile App Build
FROM base AS mobile-app-builder
WORKDIR /app/apps/mobile-app
COPY apps/mobile-app/package.json ./
COPY apps/mobile-app/ ./
RUN yarn build

# Auth Service Build
FROM base AS auth-service-builder
WORKDIR /app/services/auth-service
COPY services/auth-service/package.json ./
COPY services/auth-service/ ./
RUN yarn build

# Task Service Build
FROM base AS task-service-builder
WORKDIR /app/services/task-service
COPY services/task-service/package.json ./
COPY services/task-service/ ./
RUN yarn build

# Production Images
FROM node:18-alpine AS web-app
WORKDIR /app
COPY --from=web-app-builder /app/apps/web-app/dist ./dist
COPY --from=web-app-builder /app/apps/web-app/package.json ./
RUN yarn install --production
EXPOSE 3000
CMD ["yarn", "start"]

FROM node:18-alpine AS auth-service
WORKDIR /app
COPY --from=auth-service-builder /app/services/auth-service/dist ./dist
COPY --from=auth-service-builder /app/services/auth-service/package.json ./
RUN yarn install --production
EXPOSE 3001
CMD ["yarn", "start:prod"]

FROM node:18-alpine AS task-service
WORKDIR /app
COPY --from=task-service-builder /app/services/task-service/dist ./dist
COPY --from=task-service-builder /app/services/task-service/package.json ./
RUN yarn install --production
EXPOSE 3002
CMD ["yarn", "start:prod"] 