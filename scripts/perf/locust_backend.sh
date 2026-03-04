#!/usr/bin/env bash
set -euo pipefail

API_URL="${1:-http://localhost:8000}"
REPORTS_DIR="${2:-reports}"
VENV_BIN="${3:-backend/.venv/bin}"

TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="${REPORTS_DIR}/locust/${TS}"
CSV_PREFIX="${OUT_DIR}/locust"

USERS="${LOCUST_USERS:-10}"
SPAWN_RATE="${LOCUST_SPAWN_RATE:-2}"
RUN_TIME="${LOCUST_RUN_TIME:-30s}"

mkdir -p "${OUT_DIR}"

if [[ ! -x "${VENV_BIN}/locust" ]]; then
  echo "ERROR: locust not found at ${VENV_BIN}/locust" >&2
  echo "Hint: make install-back (installs backend dev extras incl. locust)" >&2
  exit 1
fi

"${VENV_BIN}/locust" \
  -f backend/perf/locustfile.py \
  --headless \
  -H "${API_URL}" \
  -u "${USERS}" \
  -r "${SPAWN_RATE}" \
  -t "${RUN_TIME}" \
  --only-summary \
  --csv "${CSV_PREFIX}" \
  --csv-full-history

export OUT_DIR API_URL USERS SPAWN_RATE RUN_TIME
python3 - <<'PY'
import csv
import json
import os
from pathlib import Path

out_dir = Path(os.environ['OUT_DIR'])
stats_path = out_dir / 'locust_stats.csv'

rows = []
if stats_path.exists():
    with stats_path.open() as f:
        reader = csv.DictReader(f)
        rows = list(reader)

# Extract p95 for the main endpoints (if present)
keyed = {(r.get('Name'), r.get('Type')): r for r in rows}

def p95(name, typ='GET'):
    r = keyed.get((name, typ)) or keyed.get((name, ''))
    if not r:
        return None
    v = r.get('95%')
    try:
        return float(v)
    except Exception:
        return None

summary = {
    'api_url': os.environ.get('API_URL'),
    'params': {
        'users': int(os.environ.get('USERS', '0') or 0),
        'spawn_rate': float(os.environ.get('SPAWN_RATE', '0') or 0),
        'run_time': os.environ.get('RUN_TIME'),
    },
    'targets_ms': {
        'api_p95': 500,
        'plan_generate_p95': 5000,
    },
    'p95_ms': {
        'health_live': p95('GET /api/v1/health/live'),
        'plans_generate': p95('POST /api/v1/plans/generate', 'POST'),
    },
}

summary['pass'] = {
    'api_p95': summary['p95_ms']['health_live'] is not None and summary['p95_ms']['health_live'] < summary['targets_ms']['api_p95'],
    'plan_generate_p95': summary['p95_ms']['plans_generate'] is None or summary['p95_ms']['plans_generate'] < summary['targets_ms']['plan_generate_p95'],
}

(out_dir / 'summary.json').write_text(json.dumps(summary, indent=2))
print(f"Wrote: {out_dir / 'summary.json'}")
PY
