#!/bin/sh
set -e

# Áp migrations vào Postgres (Supabase). Cần DIRECT_URL đã set trong environment.
npx prisma migrate deploy --schema=./prisma/schema.prisma

exec "$@"
