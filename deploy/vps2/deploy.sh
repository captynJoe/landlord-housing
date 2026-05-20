#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
app_root="$(cd "$script_dir/../.." && pwd)"
env_file="${ESTATEDESK_VPS2_ENV_FILE:-$app_root/.env.vps2}"
run_seed="false"

usage() {
  echo "Usage: $0 [--seed]" >&2
  echo "Set ESTATEDESK_VPS2_ENV_FILE to use a custom env file." >&2
}

case "${1:-}" in
  "")
    ;;
  --seed)
    run_seed="true"
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

docker compose --env-file "$env_file" -f "$app_root/docker-compose.vps2.yml" up -d --build

if [ "$run_seed" = "true" ]; then
  docker compose --env-file "$env_file" -f "$app_root/docker-compose.vps2.yml" run --rm landlord_housing_api npm run prisma:deploy
  docker compose --env-file "$env_file" -f "$app_root/docker-compose.vps2.yml" run --rm landlord_housing_api npm run prisma:seed
fi

bind_ip="$(awk -F= '$1 == "ESTATEDESK_PRIVATE_BIND_IP" { print $2; exit }' "$env_file")"
if command -v curl >/dev/null 2>&1; then
  curl -fsS "http://$bind_ip:4110/health"
  echo
else
  echo "curl not found; check health from VPS1 or run: curl -fsS http://$bind_ip:4110/health"
fi
