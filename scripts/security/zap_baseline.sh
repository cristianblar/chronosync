#!/usr/bin/env bash
set -euo pipefail

TARGET_URL="${1:?usage: zap_baseline.sh <target_url> [reports_dir]}"
REPORTS_DIR="${2:-reports}"

# ZAP runs inside Docker.
# - macOS/Windows: container can't reach host via localhost → rewrite to host.docker.internal.
# - Linux CI: we use --network host so localhost works (no rewrite).
DOCKER_NET=""
if [[ "$(uname -s)" != "Linux" ]]; then
  TARGET_URL=$(python3 - "${TARGET_URL}" <<'PY'
import sys
from urllib.parse import urlparse, urlunparse
u = sys.argv[1]
p = urlparse(u)
host = p.hostname
if host in {'localhost', '127.0.0.1'}:
    netloc = 'host.docker.internal'
    if p.port:
        netloc += f":{p.port}"
    p = p._replace(netloc=netloc)
print(urlunparse(p))
PY
  )
else
  DOCKER_NET="--network host"
fi

TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="${REPORTS_DIR}/zap/${TS}"
mkdir -p "${OUT_DIR}"

# zap-baseline exits non-zero when it finds alerts. We want the report either way.
set +e

docker run --rm -t \
  ${DOCKER_NET} \
  -v "${PWD}/${OUT_DIR}:/zap/wrk" \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py \
    -t "${TARGET_URL}" \
    -r zap_report.html \
    -J zap_report.json

STATUS=$?
set -e

echo "ZAP exit code: ${STATUS}" | tee "${OUT_DIR}/zap_exit_code.txt" >/dev/null

echo "Wrote: ${OUT_DIR}/zap_report.html"
echo "Wrote: ${OUT_DIR}/zap_report.json"

# By default, don't fail the whole local suite on WARNs/alerts; keep exit code in the report.
# Set ZAP_STRICT=1 to propagate zap-baseline exit code.
if [[ "${ZAP_STRICT:-0}" = "1" ]]; then
  exit ${STATUS}
fi
exit 0
