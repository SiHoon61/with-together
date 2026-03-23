FROM node:20-alpine AS web-builder
WORKDIR /build/web

COPY web/package.json web/package-lock.json ./
RUN npm ci

COPY web/ ./
RUN npm run build


FROM golang:1.24-alpine AS server-builder
WORKDIR /build/server

COPY server/go.mod server/go.sum ./
RUN go mod download

COPY server/ ./
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/quest-room ./cmd/api


FROM alpine:3.20
WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata && \
    addgroup -S app && \
    adduser -S -G app app

COPY --from=server-builder /out/quest-room /app/quest-room
COPY server/db/migrations /app/server/db/migrations
COPY --from=web-builder /build/web/dist /app/web/dist

ENV APP_ENV=production \
    PORT=8080 \
    STATIC_DIR=/app/web/dist \
    RUN_MIGRATIONS=true \
    MIGRATIONS_PATH=/app/server/db/migrations

RUN chown -R app:app /app

USER app

EXPOSE 8080

CMD ["/app/quest-room"]
