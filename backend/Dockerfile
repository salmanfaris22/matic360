# ── build stage ─────────────────────────────────────────
FROM golang:1.26-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/api ./cmd/api

# ── run stage ───────────────────────────────────────────
FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=build /bin/api /app/api
RUN mkdir -p /app/uploads
EXPOSE 8080
ENTRYPOINT ["/app/api"]
