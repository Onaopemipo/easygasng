#!/usr/bin/env bash
# Local-only Compose rehearsal. Uses a fresh internal network, throwaway volumes,
# synthetic identities, a temporary CA, and no published ports.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
export EASYGAS_REHEARSAL_IMAGE="${1:-}"
if [[ ! "$EASYGAS_REHEARSAL_IMAGE" =~ ^easygas:local-acceptance-[A-Za-z0-9_.-]+$ ]]; then
  printf 'Supply an existing easygas:local-acceptance-* image.\n' >&2
  exit 2
fi
docker image inspect "$EASYGAS_REHEARSAL_IMAGE" >/dev/null
umask 077
scratch=$(mktemp -d /tmp/eg-compose-XXXXXX)
project="eg-readiness-${scratch##*-}"
project=$(printf '%s' "$project" | tr '[:upper:]' '[:lower:]')
export EASYGAS_RELEASE_SHA=$(git rev-parse HEAD)
export EASYGAS_PRODUCTION_ENV_FILE="$scratch/runtime.env"
export EASYGAS_MIGRATION_ENV_FILE="$scratch/migrate.env"
export EASYGAS_DATABASE_TLS_DIRECTORY="$scratch/tls"
export EASYGAS_POSTGRES_PASSWORD_FILE="$scratch/pg-password"
dc() { docker compose -p "$project" -f deploy/compose.yml -f deploy/compose.namecheap.yml -f "$scratch/isolated.yml" "$@"; }
cleanup() { dc down -v --remove-orphans >/dev/null 2>&1 || true; rm -rf "$scratch"; }
mkdir "$scratch/tls"
trap cleanup EXIT
openssl req -new -x509 -newkey rsa:2048 -nodes -days 2 -subj /CN=postgres -addext subjectAltName=DNS:postgres -keyout "$scratch/tls/server.key" -out "$scratch/tls/server.crt" >/dev/null 2>&1
cp "$scratch/tls/server.crt" "$scratch/tls/ca.crt"
chmod 644 "$scratch/tls/ca.crt" "$scratch/tls/server.crt"
# Install a postgres-owned key in a throwaway volume (portable across Docker Desktop mounts).
printf 'fixture-only-migrator-password\n' >"$EASYGAS_POSTGRES_PASSWORD_FILE"
cat >"$EASYGAS_PRODUCTION_ENV_FILE" <<ENV
APP_URL=https://easygas.rehearsal.invalid
EASYGAS_RELEASE_SHA=$EASYGAS_RELEASE_SHA
DATABASE_URL=postgresql://easygas_runtime:fixture-only-runtime-password@postgres/easygas?sslmode=verify-full&sslrootcert=/run/easygas/ca.crt
EASYGAS_EMAIL_ENABLED=true
SMTP_HOST=unroutable.invalid
SMTP_PORT=587
SMTP_FROM=fixture@example.invalid
SMTP_USER=fixture
SMTP_PASSWORD=fixture-only-not-a-provider-key
ENV
printf 'DATABASE_URL=postgresql://easygas_migrator:fixture-only-migrator-password@postgres/easygas?sslmode=verify-full&sslrootcert=/run/easygas/ca.crt\n' >"$EASYGAS_MIGRATION_ENV_FILE"
cat >"$scratch/isolated.yml" <<'YML'
services:
  postgres:
    volumes:
      - test_tls:/var/lib/test-tls
    entrypoint: ["sh", "-ec", "cp /etc/easygas/tls/server.* /var/lib/test-tls/; chown postgres:postgres /var/lib/test-tls/server.*; chmod 0600 /var/lib/test-tls/server.key; exec docker-entrypoint.sh \"$$@\"","--"]
    command: ["postgres","-c","ssl=on","-c","ssl_cert_file=/var/lib/test-tls/server.crt","-c","ssl_key_file=/var/lib/test-tls/server.key","-c","hba_file=/etc/easygas/pg_hba.conf","-c","password_encryption=scram-sha-256"]
  web:
    image: ${EASYGAS_REHEARSAL_IMAGE:?Set local image}
    ports: !reset []
  worker:
    image: ${EASYGAS_REHEARSAL_IMAGE:?Set local image}
  migrate:
    image: ${EASYGAS_REHEARSAL_IMAGE:?Set local image}
networks:
  default:
    internal: true
volumes:
  test_tls:
YML
dc config --quiet
dc up -d --wait --wait-timeout 50 postgres
dc --profile maintenance run --no-deps --rm migrate
dc exec -T -e PGPASSWORD=fixture-only-migrator-password postgres psql -v ON_ERROR_STOP=1 -U easygas_migrator -d easygas >/dev/null <<'SQL'
CREATE ROLE easygas_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD 'fixture-only-runtime-password';
GRANT easygas_server TO easygas_runtime;
INSERT INTO easygas_private.users(id,name,email,password_hash,role,branch_id)
VALUES ('a1b2c3d4-1111-4444-8888-123456789012','Fixture Owner','fixture@example.invalid','invalid-fixture-no-login','owner','lagos');
SQL
dc run --rm --no-deps web npm run release:check
dc up -d --no-build web worker
for ((n=0; n<20; n++)); do
 if dc exec -T web node --import tsx scripts/healthcheck.ts; then
  printf 'COMPOSE-READINESS-01 PASS: TLS, migrations, restricted role, web and worker on isolated network\n'
  exit 0
 fi
 sleep 2
done
dc logs --tail 20 web worker
exit 1
