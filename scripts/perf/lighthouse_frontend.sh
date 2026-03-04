#!/usr/bin/env bash
set -euo pipefail

WEB_URL="${1:-http://localhost:3000}"
REPORTS_DIR="${2:-reports}"

TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="${REPORTS_DIR}/lighthouse/${TS}"

mkdir -p "${OUT_DIR}"

if [[ ! -f "frontend/package.json" ]]; then
  echo "ERROR: must run from repo root (frontend/package.json not found)." >&2
  exit 1
fi

# Requires: npm ci (frontend) so node_modules/.bin/lighthouse exists.
# Lighthouse CLI also needs a Chrome/Chromium binary. Prefer Playwright Chromium (auto-install).

chrome_path="${CHROME_PATH:-}"

if [[ -n "${chrome_path}" && ! -x "${chrome_path}" ]]; then
  echo "ERROR: CHROME_PATH is set but not executable: ${chrome_path}" >&2
  exit 1
fi

if [[ -z "${chrome_path}" && -x "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]]; then
  chrome_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
elif [[ -z "${chrome_path}" && -x "/Applications/Chromium.app/Contents/MacOS/Chromium" ]]; then
  chrome_path="/Applications/Chromium.app/Contents/MacOS/Chromium"
fi

if [[ -z "${chrome_path}" ]]; then
  # Use the repo's Node + frontend/node_modules for module resolution.
  chrome_path=$(cd frontend && node -e 'const { chromium } = require("playwright"); process.stdout.write(chromium.executablePath());' 2>/dev/null || true)
  if [[ -n "${chrome_path}" && ! -x "${chrome_path}" ]]; then
    echo "→ Playwright Chromium not found; installing…" >&2
    (cd frontend && ./node_modules/.bin/playwright install chromium)
    chrome_path=$(cd frontend && node -e 'const { chromium } = require("playwright"); process.stdout.write(chromium.executablePath());')
  fi
fi

if [[ -z "${chrome_path}" || ! -x "${chrome_path}" ]]; then
  echo "ERROR: No Chrome/Chromium installation found (set CHROME_PATH or install Chrome)." >&2
  exit 1
fi

CHROME_PATH="${chrome_path}" npm --prefix frontend exec -- lighthouse "${WEB_URL}" \
  --output=json \
  --output-path="${OUT_DIR}/lighthouse.json" \
  --chrome-flags="--headless" \
  --quiet

export OUT_DIR
node - <<'NODE'
const fs = require('fs');
const path = require('path');

const outDir = process.env.OUT_DIR;
const jsonPath = path.join(outDir, 'lighthouse.json');
const report = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

function ms(auditId) {
  const v = report?.audits?.[auditId]?.numericValue;
  return typeof v === 'number' ? v : null;
}

const summary = {
  url: report?.finalUrl ?? null,
  fetchTime: report?.fetchTime ?? null,
  categoryScores: {
    performance: report?.categories?.performance?.score ?? null,
    accessibility: report?.categories?.accessibility?.score ?? null,
    bestPractices: report?.categories?.['best-practices']?.score ?? null,
    seo: report?.categories?.seo?.score ?? null,
  },
  metrics_ms: {
    first_contentful_paint: ms('first-contentful-paint'),
    largest_contentful_paint: ms('largest-contentful-paint'),
    time_to_interactive: ms('interactive'),
    speed_index: ms('speed-index'),
    total_blocking_time: ms('total-blocking-time'),
    cumulative_layout_shift: report?.audits?.['cumulative-layout-shift']?.numericValue ?? null,
  },
  targets_ms: {
    initial_load_lcp: 3000,
  },
};

summary.pass = {
  initial_load_lcp: summary.metrics_ms.largest_contentful_paint != null
    ? summary.metrics_ms.largest_contentful_paint < summary.targets_ms.initial_load_lcp
    : null,
};

fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(`Wrote: ${path.join(outDir, 'summary.json')}`);
NODE
