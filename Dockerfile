# Builder
FROM --platform=linux/amd64 node:20-alpine AS builder
WORKDIR /app

COPY . .

RUN yarn cache clean
RUN yarn install
RUN yarn build

# Release
FROM jxxghp/moviepilot:1.9.15

COPY --from=builder /app/dist /public
