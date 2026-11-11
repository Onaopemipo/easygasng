# Namecheap VPS deployment preparation — 5 November 2026

Status: **NOT DEPLOYED / production NO-GO**. The user selected Namecheap VPS but does not yet have a server. No purchase, DNS change or remote installation was performed. Existing application and physical/financial release gates remain mandatory. The Excel reconciliation/import hold is unchanged.

## Required operator inputs

A provisioned Linux VPS with SSH key access, supported Docker Engine/Compose plugin and nginx; server IP; control of easygasng.com DNS; approved SMTP sender; reviewed source revision; independent finance/safety/privacy policy sign-off; off-host backup destination and restore test. Payments remain unconnected. SMS/WhatsApp stay disabled pending account/template acceptance.

Use Namecheap's [VPS setup instructions](https://www.namecheap.com/support/knowledgebase/article.aspx/10777/48/how-to-set-up-a-vps-beginnerfriendly-stepbystep-guide/) and Docker's [Ubuntu installation instructions](https://docs.docker.com/engine/install/ubuntu/). Do not replace an existing server's firewall or web configuration without inspecting its other hosted applications. Restrict SSH access and expose only HTTPS/HTTP publicly; PostgreSQL has no published port in this package.

## Package and secrets

Base `compose.yml` plus `compose.namecheap.yml` runs PostgreSQL, web and one worker with a named durable DB volume. Host nginx terminates HTTPS and forwards only to loopback3000. Database connections use verified TLS even on the container network. `postgres-hba.conf` rejects cleartext TCP. The migration principal and restricted application principal are distinct.

Store these outside the repository, with protected directory permissions:

- `EASYGAS_PRODUCTION_ENV_FILE`: runtime env, mode0600. `DATABASE_URL` uses a restricted `easygas_runtime` login, host `postgres`, database `easygas`, and `sslmode=verify-full&sslrootcert=/run/easygas/ca.crt`. `APP_URL=https://easygasng.com`, background jobs false, approved release SHA. No migration credentials in runtime env.
- `EASYGAS_MIGRATION_ENV_FILE`: owner/migrator connection using the same verified TLS path, mode0600; used only for reviewed maintenance.
- `EASYGAS_POSTGRES_PASSWORD_FILE`: random database administrator password, mode0600. Do not pass passwords as shell arguments.
- `EASYGAS_DATABASE_TLS_DIRECTORY`: `server.crt`, `server.key`, `ca.crt`. Certificate must have SAN `DNS:postgres`, trusted by the provided CA. Private key readable only by the PostgreSQL container UID (verify the image UID before assigning host ownership); no broad chmod. Keep CA signing key outside the mounted directory. Rotate before expiry.
- Persist message encryption and backup keys under separately controlled recovery custody. Do not regenerate keys on every deployment.

Use a real reviewed 40-character commit SHA. Use the actual reviewed commit; a syntactically valid SHA alone does not establish review or approval. Pin reviewed container image digests during release qualification.

## Reviewed initial deployment sequence

1. Validate source/dependencies, commit reviewed source and produce reproducible release image. Run `docker compose -f deploy/compose.yml -f deploy/compose.namecheap.yml config --quiet` with the protected path variables supplied. This validates configuration without printing expanded secret environment values.
2. Build the image, start **only postgres**, and inspect TLS/health. Never run bootstrap over populated data. Take an encrypted checkpoint before every upgrade.
3. Run the maintenance-profile migration service with the dedicated migrator env. Provision `easygas_runtime` as LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS; grant membership in existing `easygas_server`. Set its password through a protected interactive administrative connection (`\password`), not a command-line argument. The application must not own schema/tables or receive CREATE. Verify `release:check` under runtime credentials.
4. Configure host nginx using `nginx.conf`, obtain certificates covering both domain names, and run `nginx -t` before reload. DNS must point to the provisioned VPS first; do not guess the IP.
5. Start web and worker with runtime credentials. Verify `/api/status`, worker heartbeat, isolation/RLS, private downloads, real approved email delivery and sign-in recovery. Explicitly keep unaccepted field/reward/channel features OFF.
6. Exercise accepted customer/admin/driver/technician journeys and agreed physical stock/cash reconciliation. Perform an encrypted off-host backup and isolated restoration without overwriting the running database. Review all outstanding RTM gates before allowing real orders.

Commands are operational steps requiring the actual host and inputs; none are claimed executed remotely. Do not use `docker compose down -v` on production. Roll back application images only if compatible with preserved additive schema and ledger history; never restore an old backup over newer legitimate financial/stock events.

## Mobile ownership

Existing Zuri Tales local config and authenticated EAS identity identify Expo owner `onaopemipo`; its iOS project uses Apple team `RDQ9JJZH7F`. EasyGas is configured for that owner/team, with its own `com.easygasng.customer` identifiers. This is not evidence that App Store Connect/Google Play entries or signing profiles for EasyGas exist. Do not reuse another app's EAS project ID, bundle ID or service account contents. A valid HTTPS API, native identifier registration, credentials and signed-device acceptance are still needed before store submission.

## Local rehearsal

Build a local acceptance image with `docker build -f deploy/Dockerfile -t easygas:local-acceptance-release .`, then run `bash scripts/compose-rehearsal.sh easygas:local-acceptance-release`. The rehearsal uses the production Compose files with a temporary override: no published ports, an internal-only network, synthetic credentials and a temporary PostgreSQL certificate. It runs migrations and checks the restricted runtime, hostname-verified TLS, web readiness and worker heartbeat. It removes only the newly created rehearsal containers and volumes. It does not validate production DNS, remote backups, SMTP delivery, load or rollback.
