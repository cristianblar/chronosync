#!/usr/bin/env bash
set -euo pipefail

HOSTPORT="${1:?usage: check_tls13.sh <host:port> [reports_dir]}"
REPORTS_DIR="${2:-reports}"

TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="${REPORTS_DIR}/tls/${TS}"
mkdir -p "${OUT_DIR}"

OUT_FILE="${OUT_DIR}/openssl_s_client.txt"

# -brief is available in modern OpenSSL; if it fails, we still save output.
set +e
{
  echo | openssl s_client -connect "${HOSTPORT}" -tls1_3 -servername "${HOSTPORT%%:*}" -brief
} >"${OUT_FILE}" 2>&1
STATUS=$?
set -e

if [[ ${STATUS} -ne 0 ]]; then
  echo "TLS 1.3 negotiation failed (openssl exit ${STATUS}). Output: ${OUT_FILE}" >&2
  exit ${STATUS}
fi

if ! grep -q "TLSv1.3" "${OUT_FILE}"; then
  echo "TLS 1.3 not detected. Output: ${OUT_FILE}" >&2
  exit 1
fi

echo "✓ TLS 1.3 OK. Output: ${OUT_FILE}"
