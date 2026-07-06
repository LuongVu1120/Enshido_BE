#!/bin/sh
set -e

# Áp migrations vào DB (SQLite file nằm ở volume /app/data, xem DATABASE_URL).
npx prisma migrate deploy --schema=./prisma/schema.prisma

exec "$@"
