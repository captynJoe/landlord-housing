#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
app_root="$(cd "$script_dir/../.." && pwd)"
env_file="${ESTATEDESK_VPS2_ENV_FILE:-$app_root/.env.vps2}"
run_seed="false"
skip_migrations="false"

usage() {
  echo "Usage: $0 [--seed] [--skip-migrations]" >&2
  echo "Set ESTATEDESK_VPS2_ENV_FILE to use a custom env file." >&2
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --seed)
      run_seed="true"
      ;;
    --skip-migrations)
      skip_migrations="true"
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage
      exit 1
      ;;
  esac
  shift
done

"$script_dir/check-env.sh" "$env_file"

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

run_with_timeout() {
  local label="$1"
  local seconds="$2"
  shift 2
  local status

  echo "$label..."
  set +e
  if command -v timeout >/dev/null 2>&1; then
    timeout "${seconds}s" "$@"
  else
    echo "Warning: timeout command not found; running $label without a timeout." >&2
    "$@"
  fi
  status=$?
  set -e

  if [ "$status" -eq 124 ]; then
    echo "$label timed out after ${seconds}s." >&2
  elif [ "$status" -ne 0 ]; then
    echo "$label failed with exit code $status." >&2
  fi

  return "$status"
}

wait_for_database() {
  local attempt

  echo "Waiting for landlord_housing_db to be healthy..."
  for attempt in $(seq 1 45); do
    if "${compose_command[@]}" exec -T landlord_housing_db \
      pg_isready -U landlord_housing -d landlord_housing >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done

  echo "Database did not become healthy in time." >&2
  "${compose_command[@]}" ps >&2 || true
  "${compose_command[@]}" logs --tail=80 landlord_housing_db >&2 || true
  return 1
}

compose_command=(docker compose --env-file "$env_file" -f "$app_root/docker-compose.vps2.yml")
migration_timeout="$(read_env_value ESTATEDESK_MIGRATION_TIMEOUT_SECONDS)"
migration_timeout="${migration_timeout:-180}"

"${compose_command[@]}" build landlord_housing_api
"${compose_command[@]}" up -d landlord_housing_db
wait_for_database

if [ "$skip_migrations" != "true" ]; then
  if ! run_with_timeout "Running Prisma migrations" "$migration_timeout" \
    "${compose_command[@]}" run --rm --no-deps landlord_housing_api npm run prisma:deploy; then
    echo "API container was not recreated. Fix migrations, then rerun deploy/vps2/deploy.sh." >&2
    exit 1
  fi
else
  echo "Skipping Prisma migrations by request."
fi

if [ "$run_seed" = "true" ]; then
  if ! run_with_timeout "Running Prisma seed" "$migration_timeout" \
    "${compose_command[@]}" run --rm --no-deps landlord_housing_api npm run prisma:seed; then
    echo "Seed failed. API container was not recreated." >&2
    exit 1
  fi
fi

"${compose_command[@]}" up -d --no-deps landlord_housing_api

bind_ip="$(awk -F= '$1 == "ESTATEDESK_PRIVATE_BIND_IP" { print $2; exit }' "$env_file")"
health_host="$bind_ip"
if [ "$health_host" = "0.0.0.0" ]; then
  health_host="127.0.0.1"
fi
health_url="http://$health_host:4110/health"

if command -v curl >/dev/null 2>&1; then
  for attempt in $(seq 1 45); do
    if curl -fsS "$health_url"; then
      echo
      exit 0
    fi
    sleep 2
  done

  echo "API did not become healthy at $health_url" >&2
  "${compose_command[@]}" ps >&2 || true
  "${compose_command[@]}" logs --tail=120 landlord_housing_api >&2 || true
  exit 1
else
  echo "curl not found; check health from VPS1 or run: curl -fsS $health_url"
fi
