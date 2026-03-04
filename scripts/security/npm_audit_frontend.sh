#!/usr/bin/env bash
set -euo pipefail

REPORTS_DIR="${1:-reports}"

TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="${REPORTS_DIR}/npm-audit/${TS}"
mkdir -p "${OUT_DIR}"

OUT_FILE="${OUT_DIR}/npm_audit.json"

set +e
npm --prefix frontend audit --json >"${OUT_FILE}" 2>"${OUT_DIR}/npm_audit.stderr.txt"
STATUS=$?
set -e
echo "npm audit exit code: ${STATUS}" >"${OUT_DIR}/exit_code.txt"
echo "Wrote: ${OUT_FILE}"

# By default, don't fail the whole local suite; keep exit code + JSON report.
# Set NPM_AUDIT_STRICT=1 to propagate npm audit exit code.
if [[ "${NPM_AUDIT_STRICT:-0}" = "1" ]]; then
  exit ${STATUS}
fi
exit 0
