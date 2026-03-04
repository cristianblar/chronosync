##
# Backend Makefile
# Run from /backend directory.
##
.PHONY: dev docker-up docker-down test-unit test-integration lint format install typecheck \
        test-perf test-security

UV      := $(shell which uv 2>/dev/null || echo $(HOME)/.local/bin/uv)
VENV_BIN := ./.venv/bin
REPORTS_DIR ?= ../reports
API_URL ?= http://localhost:8000

install:
	UV_PYTHON_PREFERENCE=managed $(UV) venv --python 3.12
	UV_PYTHON_PREFERENCE=managed $(UV) sync --extra dev

dev:
	$(VENV_BIN)/uvicorn app.main:app --reload

docker-up:
	docker compose up -d --build

docker-down:
	docker compose down -v

test-unit:
	@mkdir -p coverage-reports
	UV_PYTHON_PREFERENCE=managed $(VENV_BIN)/pytest tests/unit/ -q \
	  --cov=app.services.optimization \
	  --cov=app.utils.meq_scoring \
	  --cov=app.utils.tracking_metrics \
	  --cov-report=term-missing:skip-covered \
	  --cov-report=xml:coverage-reports/coverage.xml \
	  --cov-report=html:coverage-reports/html \
	  --cov-fail-under=70

test-integration:
	@status=0; \
	docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from api_test || status=$$?; \
	docker compose -f docker-compose.test.yml down -v; \
	exit $$status

lint:
	$(VENV_BIN)/ruff check app/ tests/

format:
	$(VENV_BIN)/ruff format app/ tests/

typecheck:
	$(VENV_BIN)/mypy --config-file pyproject.toml app/utils/tracking_metrics.py app/utils/meq_scoring.py

# Perf/security (run from repo root for full suite)

test-perf:
	@mkdir -p $(REPORTS_DIR)
	@../scripts/perf/locust_backend.sh "$(API_URL)" "$(REPORTS_DIR)" "$(VENV_BIN)"

test-security:
	UV_PYTHON_PREFERENCE=managed $(VENV_BIN)/pytest tests/unit/test_jwt_security.py tests/unit/test_security_headers.py -q
