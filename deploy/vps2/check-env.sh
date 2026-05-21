#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
app_root="$(cd "$script_dir/../.." && pwd)"
env_file="${1:-$app_root/.env.vps2}"

if [ ! -f "$env_file" ]; then
  echo "Missing env file: $env_file" >&2
  echo "Create it from deploy/vps2/env.estatedesk.example, then replace placeholders." >&2
  exit 1
fi

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

require_real_value() {
  local key="$1"
  local value
  value="$(read_env_value "$key")"

  if [ -z "$value" ]; then
    echo "Missing required value: $key" >&2
    return 1
  fi

  case "$value" in
    *"<"*|*">"*|*"example.com"*)
      echo "Replace placeholder value for: $key" >&2
      return 1
      ;;
  esac
}

required_values=(
  ESTATEDESK_PRIVATE_BIND_IP
  ESTATEDESK_BASE_URL
  ESTATEDESK_CORS_ORIGIN
  LANDLORD_HOUSING_DB_PASSWORD
  ESTATEDESK_WIFI_PAYMENT_CALLBACK_TOKEN
  ESTATEDESK_MPESA_RENT_CALLBACK_TOKEN
  ESTATEDESK_RECOVERY_LANDLORD_PASSWORD
  ESTATEDESK_RECOVERY_ADMIN_PASSWORD
  ESTATEDESK_RECOVERY_ROOT_PASSWORD
  ESTATEDESK_SEED_OWNER_PASSWORD
)

failed=0
for key in "${required_values[@]}"; do
  require_real_value "$key" || failed=1
done

base_url="$(read_env_value ESTATEDESK_BASE_URL)"
callback_url="$(read_env_value ESTATEDESK_MPESA_CALLBACK_URL)"

if [ -n "$callback_url" ] && [ "$callback_url" != "$base_url/api/payments/mpesa/rent-callback" ]; then
  echo "Warning: ESTATEDESK_MPESA_CALLBACK_URL does not match BASE_URL rent callback path." >&2
fi

bind_ip="$(read_env_value ESTATEDESK_PRIVATE_BIND_IP)"
if [ -n "$bind_ip" ] && [ "$bind_ip" != "0.0.0.0" ] && command -v ip >/dev/null 2>&1; then
  if ! ip -o addr show | awk '{ print $4 }' | cut -d/ -f1 | grep -qx "$bind_ip"; then
    echo "ESTATEDESK_PRIVATE_BIND_IP is not assigned to this VPS: $bind_ip" >&2
    echo "Use this VPS private/VPN IP from: ip -brief addr" >&2
    failed=1
  fi
fi

if [ "$failed" -ne 0 ]; then
  exit 1
fi

docker compose --env-file "$env_file" -f "$app_root/docker-compose.vps2.yml" config >/dev/null

echo "VPS2 env and compose config look ready: $env_file"
