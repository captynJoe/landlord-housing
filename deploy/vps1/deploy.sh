#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
app_root="$(cd "$script_dir/../.." && pwd)"
env_file="${ESTATEDESK_VPS1_ENV_FILE:-$app_root/.env.vps1}"
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

usage() {
  echo "Usage: $0" >&2
  echo "Set ESTATEDESK_VPS1_ENV_FILE or ESTATEDESK_VPS1_BASE_COMPOSE to override defaults." >&2
}

case "${1:-}" in
  "")
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

"$script_dir/check-env.sh" "$env_file"

(
  cd "$stack_root"
  docker compose "${compose_env_args[@]}" \
    -f "$base_compose" \
    -f "$app_root/deploy/vps1/docker-compose.estatedesk.yml" \
    up -d --force-recreate landlord_housing_web nginx

  compose_project_name="$(
    awk -F= '$1 == "COMPOSE_PROJECT_NAME" { print $2; exit }' "$stack_root/.env" 2>/dev/null || true
  )"
  compose_project_name="${compose_project_name:-captyn_vps1}"
  old_estatedesk_web_containers="$(
    docker ps -aq \
      --filter "label=com.docker.compose.project=$compose_project_name" \
      --filter "label=com.docker.compose.service=estatedesk_web"
  )"
  if [ -n "$old_estatedesk_web_containers" ]; then
    docker rm -f $old_estatedesk_web_containers >/dev/null
  fi

  docker compose "${compose_env_args[@]}" \
    -f "$base_compose" \
    -f "$app_root/deploy/vps1/docker-compose.estatedesk.yml" \
    exec -T nginx nginx -t
)
