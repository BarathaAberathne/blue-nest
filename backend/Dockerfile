# ── Build stage ───────────────────────────────────────────────────────────────
FROM golang:1.26.3-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o bin/api ./cmd/api
# Also build the seed binary so `make seed-users` works on the droplet
# without a Go toolchain installed on the host.
RUN CGO_ENABLED=0 GOOS=linux go build -o bin/seedusers ./cmd/seedusers

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app
COPY --from=builder /app/bin/api .
COPY --from=builder /app/bin/seedusers .

# Bake the seed images (backend/uploads/products/*) into the image so a fresh
# `docker compose up` always has them, even when the uploads_data volume is
# wiped. On first start with an empty named volume, Docker initialises it from
# the image's contents, so seed images land in the volume automatically.
# Admin-uploaded images that arrive later still persist in the same volume.
COPY --from=builder /app/uploads ./uploads

EXPOSE 8080
CMD ["./api"]
