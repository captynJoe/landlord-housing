#!/usr/bin/env bash
set -euo pipefail

if [ ! -f ".env" ]; then
  cp .env.example .env
fi

echo "Starting local PostgreSQL..."
docker compose up -d postgres

echo "Waiting for PostgreSQL to become ready..."
until docker compose exec -T postgres pg_isready -U captyn -d landlord_housing >/dev/null 2>&1; do
  sleep 2
done

echo "Preparing Prisma..."
npm run prisma:generate
npm run prisma:deploy
npm run prisma:seed

echo "Starting API in development mode..."
npm run dev
