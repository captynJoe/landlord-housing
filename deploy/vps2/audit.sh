#!/usr/bin/env bash
set -u -o pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
app_root="$(cd "$script_dir/../.." && pwd)"
env_file="${ESTATEDESK_VPS2_ENV_FILE:-$app_root/.env.vps2}"
compose_command=(docker compose --env-file "$env_file" -f "$app_root/docker-compose.vps2.yml")

failed=0
warned=0

section() {
  printf '\n== %s ==\n' "$1"
}

pass() {
  printf 'ok: %s\n' "$1"
}

warn() {
  printf 'warn: %s\n' "$1" >&2
  warned=$((warned + 1))
}

fail() {
  printf 'fail: %s\n' "$1" >&2
  failed=$((failed + 1))
}

read_env_value() {
  local key="$1"
  awk -v key="$key" '
    BEGIN { FS = "=" }
    /^[[:space:]]*#/ || /^[[:space:]]*$/ { next }
    $1 == key {
      sub(/^[^=]*=/, "")
      print
      exit
    }
  ' "$env_file"
}

check_secret() {
  local key="$1"
  local minimum_length="$2"
  local value
  value="$(read_env_value "$key")"

  if [ -z "$value" ]; then
    fail "$key is missing"
    return
  fi

  case "$value" in
    *"<"*|*">"*|*"example.com"|captyn|password|Password123|ChangeMeNow123!)
      fail "$key still looks like a placeholder or weak default"
      return
      ;;
  esac

  if [ "${#value}" -lt "$minimum_length" ]; then
    warn "$key is set but shorter than ${minimum_length} characters"
    return
  fi

  pass "$key is set and not a known weak/default value"
}

run_check() {
  local label="$1"
  shift

  if "$@" >/tmp/landlord-housing-audit.out 2>&1; then
    pass "$label"
  else
    fail "$label"
    sed 's/^/  /' /tmp/landlord-housing-audit.out >&2
  fi
}

if [ ! -f "$env_file" ]; then
  fail "missing env file: $env_file"
  printf '\nAudit failed: %s failure(s), %s warning(s)\n' "$failed" "$warned" >&2
  exit 1
fi

section "Environment"
run_check "VPS2 env and compose config validate" "$script_dir/check-env.sh" "$env_file"
check_secret LANDLORD_HOUSING_DB_PASSWORD 32
check_secret ESTATEDESK_WIFI_PAYMENT_CALLBACK_TOKEN 32
check_secret ESTATEDESK_MPESA_RENT_CALLBACK_TOKEN 32
check_secret ESTATEDESK_RECOVERY_LANDLORD_PASSWORD 16
check_secret ESTATEDESK_RECOVERY_ADMIN_PASSWORD 16
check_secret ESTATEDESK_RECOVERY_ROOT_PASSWORD 16
check_secret ESTATEDESK_SEED_OWNER_PASSWORD 16

bind_ip="$(read_env_value ESTATEDESK_PRIVATE_BIND_IP)"
if [ "$bind_ip" = "0.0.0.0" ]; then
  fail "ESTATEDESK_PRIVATE_BIND_IP is 0.0.0.0; bind the API to the VPS2 private/VPN IP"
else
  pass "ESTATEDESK_PRIVATE_BIND_IP is not public wildcard"
fi

section "Docker"
api_cid="$("${compose_command[@]}" ps -q landlord_housing_api 2>/dev/null || true)"
db_cid="$("${compose_command[@]}" ps -q landlord_housing_db 2>/dev/null || true)"

if [ -z "$api_cid" ]; then
  fail "landlord_housing_api container is missing"
else
  api_state="$(docker inspect "$api_cid" --format '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{else}}no-health{{end}}' 2>/dev/null || true)"
  case "$api_state" in
    "running healthy") pass "landlord_housing_api is running and healthy" ;;
    *) fail "landlord_housing_api state is: ${api_state:-unknown}" ;;
  esac
fi

if [ -z "$db_cid" ]; then
  fail "landlord_housing_db container is missing"
else
  db_state="$(docker inspect "$db_cid" --format '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{else}}no-health{{end}}' 2>/dev/null || true)"
  case "$db_state" in
    "running healthy") pass "landlord_housing_db is running and healthy" ;;
    *) fail "landlord_housing_db state is: ${db_state:-unknown}" ;;
  esac
fi

section "Ports"
api_port="$("${compose_command[@]}" port landlord_housing_api 4100 2>/dev/null || true)"
if [ -z "$api_port" ]; then
  fail "landlord_housing_api does not publish host port 4110"
else
  printf '%s\n' "$api_port" | grep -Eq '(^|:)4110$' \
    && pass "landlord_housing_api publishes host port 4110" \
    || fail "landlord_housing_api publishes unexpected port: $api_port"

  case "$api_port" in
    0.0.0.0:*|[[]::*)
      fail "landlord_housing_api is bound to a public wildcard: $api_port"
      ;;
    "$bind_ip":*)
      pass "landlord_housing_api is bound to ESTATEDESK_PRIVATE_BIND_IP"
      ;;
    *)
      warn "landlord_housing_api binding differs from ESTATEDESK_PRIVATE_BIND_IP: $api_port"
      ;;
  esac
fi

if [ -n "$db_cid" ]; then
  db_ports="$(docker inspect "$db_cid" --format '{{json .NetworkSettings.Ports}}' 2>/dev/null || true)"
  if printf '%s' "$db_ports" | grep -q HostPort; then
    fail "landlord_housing_db has a host-published port: $db_ports"
  else
    pass "landlord_housing_db has no host-published ports"
  fi
fi

section "Runtime"
health_host="$bind_ip"
if [ "$health_host" = "0.0.0.0" ] || [ -z "$health_host" ]; then
  health_host="127.0.0.1"
fi
run_check "API health endpoint returns success" curl -fsS --max-time 8 "http://$health_host:4110/health"

if [ -n "$db_cid" ]; then
  run_check "PostgreSQL accepts local container connections" \
    "${compose_command[@]}" exec -T landlord_housing_db pg_isready -U landlord_housing -d landlord_housing
fi

if [ -n "$api_cid" ]; then
  run_check "Prisma migrations are applied" \
    "${compose_command[@]}" exec -T landlord_housing_api npx prisma migrate status
  run_check "uploads directory exists and is writable" \
    "${compose_command[@]}" exec -T landlord_housing_api sh -lc 'test -d /var/lib/landlord-housing/uploads && test -w /var/lib/landlord-housing/uploads'
fi

section "Backups"
backup_dir="$(read_env_value LANDLORD_HOUSING_BACKUP_DIR)"
backup_dir="${backup_dir:-$HOME/backups/landlord-housing}"

if [ -x "$script_dir/backup.sh" ]; then
  pass "backup helper is executable"
else
  fail "backup helper is missing or not executable: $script_dir/backup.sh"
fi

if [ -d "$backup_dir" ]; then
  pass "backup directory exists: $backup_dir"
  if find "$backup_dir" -type f -name 'db-*.dump' -mtime -2 | grep -q .; then
    pass "recent database backup exists"
  else
    warn "no database backup from the last 48 hours in $backup_dir"
  fi
  if find "$backup_dir" -type f -name 'uploads-*.tar.gz' -mtime -2 | grep -q .; then
    pass "recent uploads backup exists"
  else
    warn "no uploads backup from the last 48 hours in $backup_dir"
  fi
else
  warn "backup directory does not exist yet: $backup_dir"
fi

printf '\nAudit complete: %s failure(s), %s warning(s)\n' "$failed" "$warned"
if [ "$failed" -ne 0 ]; then
  exit 1
fi
