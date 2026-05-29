#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
app_root="$(cd "$script_dir/../.." && pwd)"
env_file="${ESTATEDESK_VPS2_ENV_FILE:-$app_root/.env.vps2}"

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

backup_dir="$(read_env_value LANDLORD_HOUSING_BACKUP_DIR)"
backup_dir="${backup_dir:-$HOME/backups/landlord-housing}"
retention_days="$(read_env_value LANDLORD_HOUSING_BACKUP_RETENTION_DAYS)"
retention_days="${retention_days:-14}"

if ! printf '%s' "$retention_days" | grep -Eq '^[0-9]+$'; then
  echo "LANDLORD_HOUSING_BACKUP_RETENTION_DAYS must be a whole number." >&2
  exit 1
fi

if [ "$retention_days" -lt 1 ]; then
  echo "LANDLORD_HOUSING_BACKUP_RETENTION_DAYS must be greater than 0." >&2
  exit 1
fi

"$script_dir/check-env.sh" "$env_file" >/dev/null

compose_command=(docker compose --env-file "$env_file" -f "$app_root/docker-compose.vps2.yml")
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"

install -d -m 700 "$backup_dir"

db_file="$backup_dir/db-$timestamp.dump"
uploads_file="$backup_dir/uploads-$timestamp.tar.gz"
manifest_file="$backup_dir/manifest-$timestamp.txt"
checksum_file="$backup_dir/sha256-$timestamp.txt"

tmp_files=("$db_file.tmp" "$uploads_file.tmp" "$manifest_file.tmp" "$checksum_file.tmp")
cleanup() {
  rm -f "${tmp_files[@]}"
}
trap cleanup EXIT

echo "Writing database backup: $db_file"
"${compose_command[@]}" exec -T landlord_housing_db \
  pg_dump -U landlord_housing -d landlord_housing -Fc > "$db_file.tmp"
mv "$db_file.tmp" "$db_file"
chmod 600 "$db_file"

echo "Writing uploads backup: $uploads_file"
"${compose_command[@]}" exec -T landlord_housing_api \
  sh -lc 'cd /var/lib/landlord-housing/uploads && tar -czf - .' > "$uploads_file.tmp"
mv "$uploads_file.tmp" "$uploads_file"
chmod 600 "$uploads_file"

{
  printf 'timestamp_utc=%s\n' "$timestamp"
  printf 'app_root=%s\n' "$app_root"
  printf 'env_file=%s\n' "$env_file"
  printf '\n[compose]\n'
  "${compose_command[@]}" ps
  printf '\n[health]\n'
  bind_ip="$(read_env_value ESTATEDESK_PRIVATE_BIND_IP)"
  health_host="$bind_ip"
  if [ "$health_host" = "0.0.0.0" ] || [ -z "$health_host" ]; then
    health_host="127.0.0.1"
  fi
  curl -fsS --max-time 8 "http://$health_host:4110/health" || true
  printf '\n'
} > "$manifest_file.tmp"
mv "$manifest_file.tmp" "$manifest_file"
chmod 600 "$manifest_file"

if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$db_file" "$uploads_file" "$manifest_file" > "$checksum_file.tmp"
  mv "$checksum_file.tmp" "$checksum_file"
  chmod 600 "$checksum_file"
fi

find "$backup_dir" -type f \
  \( -name 'db-*.dump' -o -name 'uploads-*.tar.gz' -o -name 'manifest-*.txt' -o -name 'sha256-*.txt' \) \
  -mtime +"$retention_days" -delete

echo "Backup complete:"
echo "  $db_file"
echo "  $uploads_file"
echo "  $manifest_file"
if [ -f "$checksum_file" ]; then
  echo "  $checksum_file"
fi
