#!/usr/bin/env bash
set -euo pipefail

REPORTS_DIR="${1:-reports}"
VENV_BIN="${2:-backend/.venv/bin}"

TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="${REPORTS_DIR}/benchmarks/${TS}"
mkdir -p "${OUT_DIR}"

if [[ ! -x "${VENV_BIN}/python" ]]; then
  echo "ERROR: python not found at ${VENV_BIN}/python" >&2
  exit 1
fi

PYTHONPATH=backend "${VENV_BIN}/python" - <<'PY' >"${OUT_DIR}/plan_generation.json"
import json
import os
from datetime import date

# Required settings fields
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://user:pass@localhost:5432/test_db")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("JWT_SECRET_KEY", "perf-test-secret")

from app.models.chronotype import ChronotypeCategory
from app.services.optimization.engine import SleepOptimizationEngine

engine = SleepOptimizationEngine(
    chronotype=ChronotypeCategory.INTERMEDIATE,
    ideal_wake_time="07:00",
    ideal_sleep_time="23:00",
    obligations=[],
)
res = engine.optimize(start_date=date(2026, 1, 20), days=7)

out = {
    "generation_time_ms": res.generation_time_ms,
    "solver_status": res.solver_status,
    "optimization_score": res.optimization_score,
    "targets_ms": {"plan_generation": 5000},
    "pass": {"plan_generation": res.generation_time_ms < 5000},
}
print(json.dumps(out, indent=2))
PY

echo "Wrote: ${OUT_DIR}/plan_generation.json"
