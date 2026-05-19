#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
app_root="$(cd "$script_dir/../.." && pwd)"
env_file="${1:-$app_root/.env.vps1}"
base_compose="${ESTATEDESK_VPS1_BASE_COMPOSE:-/home/captyn/captyn_ecommerce/byg-global/docker-compose.vps1.yml}"
base_dir="$(dirname "$base_compose")"

if [ ! -d "$base_dir" ]; then
  echo "Missing VPS1 compose directory: $base_dir" >&2
  echo "Set ESTATEDESK_VPS1_BASE_COMPOSE if the frontend stack lives elsewhere." >&2
  exit 1
fi

stack_root="$(cd "$base_dir" && pwd)"
compose_env_args=()

for stack_env_file in "$stack_root/.env" "$stack_root/.env.common" "$stack_root/.env.backend" "$stack_root/.env.frontend"; do
  if [ -f "$stack_env_file" ]; then
    compose_env_args+=(--env-file "$stack_env_file")
  fi
done
compose_env_args+=(--env-file "$env_file")

if [ ! -f "$env_file" ]; then
  echo "Missing env file: $env_file" >&2
  echo "Create it from deploy/vps1/env.estatedesk.example, then replace placeholders." >&2
  exit 1
fi

if [ ! -f "$base_compose" ]; then
  echo "Missing VPS1 base compose file: $base_compose" >&2
  echo "Set ESTATEDESK_VPS1_BASE_COMPOSE if the frontend stack lives elsewhere." >&2
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

failed=0
require_real_value ESTATEDESK_SERVER_NAME || failed=1
require_real_value ESTATEDESK_PUBLIC_DIR || failed=1
require_real_value ESTATEDESK_API_UPSTREAM || failed=1

public_dir="$(read_env_value ESTATEDESK_PUBLIC_DIR)"
if [ -n "$public_dir" ] && [ ! -d "$public_dir" ]; then
  echo "Missing ESTATEDESK_PUBLIC_DIR directory: $public_dir" >&2
  failed=1
fi

if [ "$failed" -ne 0 ]; then
  exit 1
fi

(
  cd "$stack_root"
  docker compose "${compose_env_args[@]}" \
    -f "$base_compose" \
    -f "$app_root/deploy/vps1/docker-compose.estatedesk.yml" \
    config --services | grep -qx estatedesk_web
)

echo "VPS1 env and compose override look ready: $env_file"
