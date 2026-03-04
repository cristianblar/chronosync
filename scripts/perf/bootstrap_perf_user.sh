#!/usr/bin/env bash
set -euo pipefail

API_URL="${1:-http://localhost:8000}"

EMAIL="perf_$(date -u +%Y%m%dT%H%M%SZ)_$RANDOM@chronosync.perf"
PASSWORD="${PERF_TEST_PASSWORD:-PerfTest123}"
NAME="Perf User"
TZ="UTC"

register_payload=$(python3 - <<PY
import json
print(json.dumps({
  "email": "${EMAIL}",
  "password": "${PASSWORD}",
  "name": "${NAME}",
  "timezone": "${TZ}",
}))
PY
)

register_out=$(curl -sS -X POST "${API_URL}/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "${register_payload}" \
  -w "\n%{http_code}")

register_body=$(printf "%s" "${register_out}" | sed '$d')
register_code=$(printf "%s" "${register_out}" | tail -n 1)

if [[ "${register_code}" != "201" && "${register_code}" != "200" ]]; then
  echo "ERROR: register failed (HTTP ${register_code})" >&2
  echo "Body: ${register_body}" >&2
  exit 1
fi

token=$(python3 -c 'import json,sys
s=sys.stdin.read().strip()
try:
  obj=json.loads(s)
except Exception as e:
  raise SystemExit(f"Invalid JSON from register: {e}\nBody: {s[:500]}")
print(obj.get("access_token") or "")' <<<"${register_body}")

if [[ -z "${token}" ]]; then
  echo "ERROR: access_token missing in register response" >&2
  echo "Body: ${register_body}" >&2
  exit 1
fi

assessment_payload=$(python3 - <<'PY'
import json
print(json.dumps({"responses": {f"q{i}": 3 for i in range(1, 20)}}))
PY
)

assess_out=$(curl -sS -X POST "${API_URL}/api/v1/chronotype/assessment" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${token}" \
  -d "${assessment_payload}" \
  -w "\n%{http_code}")

assess_body=$(printf "%s" "${assess_out}" | sed '$d')
assess_code=$(printf "%s" "${assess_out}" | tail -n 1)

if [[ "${assess_code}" != "201" && "${assess_code}" != "200" ]]; then
  echo "ERROR: chronotype assessment failed (HTTP ${assess_code})" >&2
  echo "Body: ${assess_body}" >&2
  exit 1
fi

echo "${token}"
