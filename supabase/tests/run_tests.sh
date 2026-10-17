#!/bin/bash
# ==============================================================================
# KindLink Database Automated Test Runner
# Author: KindLink Engineering (krishkumarcodes@gmail.com)
# ==============================================================================
set -e

PG_HOST="127.0.0.1"
PG_PORT="5432"
SQL_DIR="$(cd "$(dirname "$0")/../sql" && pwd)"
TEST_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "======================================================================"
echo " KindLink PostgreSQL & PostGIS Test Suite Runner"
echo "======================================================================"

# 1. Create or recreate test database
dropdb -p "$PG_PORT" -h "$PG_HOST" -U "$USER" --if-exists kindlink_test
createdb -p "$PG_PORT" -h "$PG_HOST" -U "$USER" kindlink_test

echo "[1/4] Applying Supabase local test shim..."
psql -p "$PG_PORT" -h "$PG_HOST" -U "$USER" -d kindlink_test -f "$TEST_DIR/00_supabase_shim.sql" > /dev/null

MIGRATIONS=$(cd "$SQL_DIR" && ls [0-9][0-9]_*.sql 2>/dev/null | sort)

echo "[2/4] First pass: Applying migration files 01 through 14 in order..."
for file in $MIGRATIONS; do
  echo "  -> Applying $file..."
  psql -p "$PG_PORT" -h "$PG_HOST" -U "$USER" -d kindlink_test -f "$SQL_DIR/$file" > /dev/null
done

echo "[3/4] Second pass: Proving idempotency by re-applying all migrations..."
for file in $MIGRATIONS; do
  echo "  -> Re-applying $file..."
  psql -p "$PG_PORT" -h "$PG_HOST" -U "$USER" -d kindlink_test -f "$SQL_DIR/$file" > /dev/null
done

# 4. Executing test assertions on test database
psql -p "$PG_PORT" -h "$PG_HOST" -U "$USER" -d kindlink_test -f "$TEST_DIR/run_tests.sql"

echo ""
echo "======================================================================"
echo " Fresh Database Test with all_in_one.sql"
echo "======================================================================"
dropdb -p "$PG_PORT" -h "$PG_HOST" -U "$USER" --if-exists kindlink_fresh
createdb -p "$PG_PORT" -h "$PG_HOST" -U "$USER" kindlink_fresh

echo "Applying shim and all_in_one.sql to fresh database..."
psql -p "$PG_PORT" -h "$PG_HOST" -U "$USER" -d kindlink_fresh -f "$TEST_DIR/00_supabase_shim.sql" > /dev/null
psql -p "$PG_PORT" -h "$PG_HOST" -U "$USER" -d kindlink_fresh -f "$SQL_DIR/all_in_one.sql" > /dev/null

echo "Executing test suite on all_in_one.sql fresh instance..."
psql -p "$PG_PORT" -h "$PG_HOST" -U "$USER" -d kindlink_fresh -f "$TEST_DIR/run_tests.sql"

echo ""
echo "All tests passed successfully!"
