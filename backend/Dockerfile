# ── Build stage ───────────────────────────────────────────────────────────────
FROM golang:1.26.3-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o bin/api ./cmd/api
# Also build the seed binaries so they can run inside the container on the
# droplet (no host Go toolchain, and they reach prod Mongo over the compose
# network). seedcatalogue embeds the Gompels order CSVs at build time.
RUN CGO_ENABLED=0 GOOS=linux go build -o bin/seedusers ./cmd/seedusers
RUN CGO_ENABLED=0 GOOS=linux go build -o bin/seedcatalogue ./cmd/seedcatalogue

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app
COPY --from=builder /app/bin/api .
COPY --from=builder /app/bin/seedusers .
COPY --from=builder /app/bin/seedcatalogue .

# Bake the seed images (backend/uploads/products/*) into the image so a fresh
# `docker compose up` always has them, even when the uploads_data volume is
# wiped. On first start with an empty named volume, Docker initialises it from
# the image's contents, so seed images land in the volume automatically.
# Admin-uploaded images that arrive later still persist in the same volume.
COPY --from=builder /app/uploads ./uploads

EXPOSE 8080
CMD ["./api"]
