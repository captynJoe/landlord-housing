#!/usr/bin/env bash
# Deploys Ruminjo (landlord-housing) to VPS2.
#
#   1. Local gate: server, client and public type checks plus the test suite.
#   2. The commit must already be pushed to origin/main.
#   3. VPS2 pulls it and runs deploy/vps2/deploy.sh, which builds the API image first
#      (a failed build leaves the running API untouched), migrates, then swaps it in.
#   4. /health is polled until the API answers.
#
# The web pages are served straight from this machine's public/ folder, so they go
# live as soon as they are compiled here; this script only covers the API.
#
# Env overrides: VPS2_SSH_TARGET, VPS2_REPO_PATH, LANDLORD_HEALTH_URL, NODE_BIN

set -euo pipefail

VPS2_SSH_TARGET="${VPS2_SSH_TARGET:-joe@169.58.91.25}"
VPS2_REPO_PATH="${VPS2_REPO_PATH:-/home/joe/landlord-housing}"
LANDLORD_HEALTH_URL="${LANDLORD_HEALTH_URL:-http://10.8.0.1:4110/health}"
NODE_BIN="${NODE_BIN:-node}"

cd "$(dirname "$0")/.."

step() { printf '\n==> %s\n' "$*"; }
fail() { printf '\nDEPLOY ABORTED: %s\n' "$*" >&2; exit 1; }

step "Type checks and tests"
"$NODE_BIN" node_modules/typescript/bin/tsc --noEmit -p tsconfig.json || fail "server type check failed"
"$NODE_BIN" node_modules/typescript/bin/tsc --noEmit -p tsconfig.client.json || fail "client type check failed"
"$NODE_BIN" node_modules/typescript/bin/tsc --noEmit -p tsconfig.public.json || fail "public type check failed"
"$NODE_BIN" --import tsx --test tests/*.test.ts > /tmp/landlord-housing-deploy-tests.log 2>&1 \
  || { tail -30 /tmp/landlord-housing-deploy-tests.log; fail "tests failed"; }
grep -E "^# (pass|fail)" /tmp/landlord-housing-deploy-tests.log

step "Checking the commit is pushed"
git fetch -q origin main
LOCAL_HEAD="$(git rev-parse HEAD)"
[ "$LOCAL_HEAD" = "$(git rev-parse origin/main)" ] \
  || fail "local HEAD is not origin/main (push or pull first)"
echo "Deploying $(git log --oneline -1)"

step "Pulling on VPS2 and running deploy/vps2/deploy.sh"
ssh -o BatchMode=yes "$VPS2_SSH_TARGET" bash -s -- "$VPS2_REPO_PATH" "$LOCAL_HEAD" <<'REMOTE' \
  || fail "VPS2 deploy failed; check the output above (a failed image build leaves the old API running)"
set -euo pipefail
cd "$1"
git checkout -- public/ 2>/dev/null || true
git pull -q --ff-only origin main
[ "$(git rev-parse HEAD)" = "$2" ] || { echo "VPS2 is at $(git rev-parse HEAD), expected $2"; exit 1; }
deploy/vps2/deploy.sh
REMOTE

step "Waiting for the API"
for _ in $(seq 1 60); do
  if curl -fsS -m 5 "$LANDLORD_HEALTH_URL" >/dev/null 2>&1; then
    step "Healthy: $(curl -fsS -m 5 "$LANDLORD_HEALTH_URL")"
    exit 0
  fi
  sleep 5
done
fail "API did not become healthy within 5 minutes; check: ssh $VPS2_SSH_TARGET docker logs --tail 80 landlord-housing-landlord_housing_api-1"
