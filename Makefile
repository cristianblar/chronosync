##
# ChronoSync root Makefile
#
# Targets:
#   Development:
#     make infra-up        Start infrastructure services (DB, Redis, Mailhog) in Docker
#     make infra-down      Stop infrastructure services
#     make dev-api         Run FastAPI backend with hot-reload (requires infra-up)
#     make dev-web         Run Next.js frontend in dev mode (requires dev-api)
#     make dev             Start infra + hint for running API and web
#
#   Full-stack Docker:
#     make up              Build and start full stack in Docker (production-mode)
#     make down            Stop and remove full stack volumes
#     make logs            Tail logs from all running services
#     make migrate         Run Alembic migrations
#     make seed            Seed education content
#
#   Tests:
#     make test-unit        Run backend + frontend unit tests
#     make test-unit-back   Run backend unit tests (local venv)
#     make test-unit-front  Run frontend unit tests (vitest)
#     make test-integration Run backend integration tests (Docker)
#     make test-e2e         Run Playwright E2E tests (Docker stack + host Playwright)
#     make test-all         Run unit + integration + e2e
#
#   Performance:
#     make test-perf        Run perf suite in an isolated Docker stack (auto setup/teardown)
#     make test-perf-front  Run Lighthouse against WEB_URL (requires web already running)
#     make test-perf-back   Run Locust against API_URL (requires api already running; /plans/generate needs CHRONOSYNC_ACCESS_TOKEN)
#     make test-perf-plan   Benchmark plan generation (no API required)
#     make perf-up          Start perf Docker stack (isolated ports)
#     make perf-down        Stop perf Docker stack + volumes
#
#   Security:
#     make test-security-back          Run basic backend security unit tests (JWT + headers)
#     make test-security-front-audit   Run npm audit for frontend deps (writes JSON report)
#     make test-security-tls           Check TLS 1.3 negotiation (HOSTPORT=example.com:443)
#     make test-security-zap-web       OWASP ZAP baseline scan against WEB_URL
#     make test-security-zap-api       OWASP ZAP baseline scan against API_URL
#     make test-security               Run basic security suite
#
#   Code quality:
#     make lint            Run ruff (backend) + eslint (frontend)
#     make format          Run ruff format (backend)
#     make typecheck       Run tsc (frontend) + targeted mypy (backend)
##

.PHONY: infra-up infra-down dev-api dev-web dev \
        up down logs migrate seed \
        test-unit test-unit-back test-unit-front test-integration test-e2e test-all \
        perf-up perf-down test-perf-front test-perf-back test-perf-plan test-perf \
        test-security-back test-security-front-audit test-security-tls test-security-zap-web test-security-zap-api test-security \
        lint format typecheck \
        install-back install-front install \
        clean

BACKEND_DIR  := backend
FRONTEND_DIR := frontend
VENV         := $(BACKEND_DIR)/.venv/bin
UV           := $(shell which uv 2>/dev/null || echo $(HOME)/.local/bin/uv)

REPORTS_DIR := reports
WEB_URL ?= http://localhost:3000
API_URL ?= http://localhost:8000
HOSTPORT ?= localhost:443

# ─── Installation ─────────────────────────────────────────────────────────────

install-back:
	@echo "→ Installing backend dependencies…"
	UV_PYTHON_PREFERENCE=managed $(UV) venv --python 3.12 --project $(BACKEND_DIR)
	UV_PYTHON_PREFERENCE=managed $(UV) sync --extra dev --project $(BACKEND_DIR)

install-front:
	@echo "→ Installing frontend dependencies…"
	cd $(FRONTEND_DIR) && npm ci

install: install-back install-front
	@echo "✓ All dependencies installed."

# ─── Development (local hot-reload) ───────────────────────────────────────────

infra-up:
	docker compose -f docker-compose.dev.yml up -d
	@echo "✓ Infrastructure running (DB:5432, Redis:6379, Mailhog:8025)"

infra-down:
	docker compose -f docker-compose.dev.yml down -v

dev-api: infra-up
	@echo "→ Starting FastAPI (http://localhost:8000)…"
	@cp -n $(BACKEND_DIR)/.env.example $(BACKEND_DIR)/.env 2>/dev/null || true
	UV_PYTHON_PREFERENCE=managed $(VENV)/uvicorn app.main:app --reload --app-dir $(BACKEND_DIR)

dev-web:
	@echo "→ Starting Next.js dev server (http://localhost:3000)…"
	cd $(FRONTEND_DIR) && NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev

dev: infra-up
	@echo ""
	@echo "Infrastructure is running. Now open two more terminals and run:"
	@echo "  make dev-api   (terminal 2)"
	@echo "  make dev-web   (terminal 3)"
	@echo ""

# ─── Full-stack Docker (production images) ────────────────────────────────────

up:
	@cp -n $(BACKEND_DIR)/.env.example $(BACKEND_DIR)/.env 2>/dev/null || true
	docker compose up -d --build
	@echo "✓ Full stack running"
	@echo "  Frontend:  http://localhost:3000"
	@echo "  API:       http://localhost:8000"
	@echo "  API docs:  http://localhost:8000/docs"
	@echo "  Mailhog:   http://localhost:8025"

down:
	docker compose down -v

logs:
	docker compose logs -f

migrate:
	docker compose --profile migrate run --rm --build db-migrate

seed:
	docker compose --profile seed run --rm --build db-seed

# ─── Unit tests (local, no Docker) ────────────────────────────────────────────

test-unit-back:
	@echo "→ Running backend unit tests (+ coverage for critical modules)…"
	@mkdir -p $(BACKEND_DIR)/coverage-reports
	UV_PYTHON_PREFERENCE=managed $(VENV)/pytest $(BACKEND_DIR)/tests/unit/ -q \
	  --cov=app.services.optimization \
	  --cov=app.utils.meq_scoring \
	  --cov=app.utils.tracking_metrics \
	  --cov-report=term-missing:skip-covered \
	  --cov-report=xml:$(BACKEND_DIR)/coverage-reports/coverage.xml \
	  --cov-report=html:$(BACKEND_DIR)/coverage-reports/html \
	  --cov-fail-under=70

test-unit-front:
	@echo "→ Running frontend unit tests (vitest)…"
	cd $(FRONTEND_DIR) && npm test

test-unit: test-unit-back test-unit-front
	@echo "✓ All unit tests passed."

# ─── Integration tests (Docker) ───────────────────────────────────────────────

test-integration:
	@echo "→ Starting integration test environment…"
	@status=0; \
	docker compose -f docker-compose.test-integration.yml up \
	  --build \
	  --abort-on-container-exit \
	  --exit-code-from api_test \
	  || status=$$?; \
	echo "→ Cleaning up integration test environment…"; \
	docker compose -f docker-compose.test-integration.yml down -v; \
	exit $$status

# ─── E2E tests (Docker stack + host Playwright) ───────────────────────────────

test-e2e:
	@echo "→ Starting E2E stack…"
	docker compose -f docker-compose.test-e2e.yml up -d --build
	@echo "→ Waiting for API (up to 90s)…"
	@for i in $$(seq 1 30); do \
	  code=$$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/api/v1/health/live 2>/dev/null); \
	  [ "$$code" = "200" ] && echo "  ✓ API ready" && break; \
	  [ "$$i" = "30" ] && echo "  ✗ API did not start" && exit 1; \
	  sleep 3; \
	done
	@echo "→ Waiting for web (up to 60s)…"
	@for i in $$(seq 1 20); do \
	  code=$$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/ 2>/dev/null); \
	  [ "$$code" = "200" ] || [ "$$code" = "307" ] && echo "  ✓ Web ready" && break; \
	  [ "$$i" = "20" ] && echo "  ✗ Web did not start" && exit 1; \
	  sleep 3; \
	done
	@echo "→ Running Playwright E2E tests…"
	@exitcode=0; \
	BASE_URL=http://localhost:3001 \
	API_URL=http://localhost:8001 \
	MAILHOG_URL=http://localhost:8026 \
	npm --prefix $(FRONTEND_DIR) run test:e2e || exitcode=$$?; \
	echo "→ Cleaning up E2E environment…"; \
	docker compose -f docker-compose.test-e2e.yml down -v; \
	exit $$exitcode

# ─── Run all test suites ───────────────────────────────────────────────────────

test-all: test-unit test-integration test-e2e
	@echo "✓ All test suites passed."

# ─── Performance tests ─────────────────────────────────────────────────────────

perf-up:
	@echo "→ Starting perf stack…"
	docker compose -f docker-compose.test-perf.yml up -d --build

perf-down:
	@echo "→ Stopping perf stack…"
	docker compose -f docker-compose.test-perf.yml down -v

test-perf-front:
	@echo "→ Lighthouse (frontend): $(WEB_URL)…"
	@mkdir -p $(REPORTS_DIR)
	@./scripts/perf/lighthouse_frontend.sh "$(WEB_URL)" "$(REPORTS_DIR)"

test-perf-back:
	@echo "→ Locust (backend): $(API_URL)…"
	@echo "  Note: export CHRONOSYNC_ACCESS_TOKEN to also measure /plans/generate"
	@mkdir -p $(REPORTS_DIR)
	@./scripts/perf/locust_backend.sh "$(API_URL)" "$(REPORTS_DIR)" "$(VENV)"

test-perf-plan:
	@echo "→ Plan generation benchmark (SleepOptimizationEngine)…"
	@mkdir -p $(REPORTS_DIR)
	@./scripts/perf/plan_generation_benchmark.sh "$(REPORTS_DIR)" "$(VENV)"

test-perf:
	@exitcode=0; \
	api_url="http://localhost:8002"; \
	web_url="http://localhost:3002"; \
	echo "→ Starting perf stack…"; \
	docker compose -f docker-compose.test-perf.yml up -d --build || exitcode=$$?; \
	if [ $$exitcode -eq 0 ]; then \
	  echo "→ Waiting for API (up to 90s)…"; \
	  for i in $$(seq 1 30); do \
	    code=$$(curl -s -o /dev/null -w "%{http_code}" "$$api_url/api/v1/health/live" 2>/dev/null); \
	    [ "$$code" = "200" ] && echo "  ✓ API ready" && break; \
	    [ "$$i" = "30" ] && echo "  ✗ API did not start" && exitcode=1 && break; \
	    sleep 3; \
	  done; \
	fi; \
	if [ $$exitcode -eq 0 ]; then \
	  echo "→ Waiting for web (up to 60s)…"; \
	  for i in $$(seq 1 20); do \
	    code=$$(curl -s -o /dev/null -w "%{http_code}" "$$web_url/" 2>/dev/null); \
	    ( [ "$$code" = "200" ] || [ "$$code" = "307" ] ) && echo "  ✓ Web ready" && break; \
	    [ "$$i" = "20" ] && echo "  ✗ Web did not start" && exitcode=1 && break; \
	    sleep 3; \
	  done; \
	fi; \
	if [ $$exitcode -eq 0 ]; then \
	  echo "→ Lighthouse…"; \
	  $(MAKE) test-perf-front WEB_URL="$$web_url" || exitcode=$$?; \
	fi; \
	if [ $$exitcode -eq 0 ]; then \
	  echo "→ Locust (incl. /plans/generate)…"; \
	  token=$$(./scripts/perf/bootstrap_perf_user.sh "$$api_url"); \
	  CHRONOSYNC_ACCESS_TOKEN=$$token ./scripts/perf/locust_backend.sh "$$api_url" "$(REPORTS_DIR)" "$(VENV)" || exitcode=$$?; \
	fi; \
	if [ $$exitcode -eq 0 ]; then \
	  echo "→ Plan generation benchmark…"; \
	  $(MAKE) test-perf-plan || exitcode=$$?; \
	fi; \
	echo "→ Cleaning up perf stack…"; \
	docker compose -f docker-compose.test-perf.yml down -v; \
	exit $$exitcode

# ─── Basic security tests ──────────────────────────────────────────────────────

test-security-back:
	@echo "→ Running backend security unit tests (JWT + headers)…"
	UV_PYTHON_PREFERENCE=managed $(VENV)/pytest $(BACKEND_DIR)/tests/unit/test_jwt_security.py $(BACKEND_DIR)/tests/unit/test_security_headers.py -q

test-security-front-audit:
	@echo "→ Frontend dependency audit (npm audit)…"
	@./scripts/security/npm_audit_frontend.sh "$(REPORTS_DIR)"

test-security-tls:
	@echo "→ TLS 1.3 check: $(HOSTPORT)…"
	@./scripts/security/check_tls13.sh "$(HOSTPORT)" "$(REPORTS_DIR)"

test-security-zap-web:
	@echo "→ OWASP ZAP baseline scan (web): $(WEB_URL)…"
	@./scripts/security/zap_baseline.sh "$(WEB_URL)" "$(REPORTS_DIR)"

test-security-zap-api:
	@echo "→ OWASP ZAP baseline scan (api): $(API_URL)…"
	@./scripts/security/zap_baseline.sh "$(API_URL)" "$(REPORTS_DIR)"

test-security:
	@exitcode=0; \
	api_url="http://localhost:8002"; \
	web_url="http://localhost:3002"; \
	echo "→ Backend security unit tests…"; \
	$(MAKE) test-security-back || exitcode=$$?; \
	echo "→ Frontend dependency audit (npm audit)…"; \
	./scripts/security/npm_audit_frontend.sh "$(REPORTS_DIR)" || exitcode=$$?; \
	echo "→ Starting isolated stack for ZAP scans…"; \
	docker compose -f docker-compose.test-perf.yml up -d --build || exitcode=$$?; \
	echo "→ Waiting for API (up to 90s)…"; \
	for i in $$(seq 1 30); do \
	  code=$$(curl -s -o /dev/null -w "%{http_code}" "$$api_url/api/v1/health/live" 2>/dev/null); \
	  [ "$$code" = "200" ] && echo "  ✓ API ready" && break; \
	  [ "$$i" = "30" ] && echo "  ✗ API did not start" && exitcode=1 && break; \
	  sleep 3; \
	done; \
	echo "→ Waiting for web (up to 60s)…"; \
	for i in $$(seq 1 20); do \
	  code=$$(curl -s -o /dev/null -w "%{http_code}" "$$web_url/" 2>/dev/null); \
	  ( [ "$$code" = "200" ] || [ "$$code" = "307" ] ) && echo "  ✓ Web ready" && break; \
	  [ "$$i" = "20" ] && echo "  ✗ Web did not start" && exitcode=1 && break; \
	  sleep 3; \
	done; \
	echo "→ OWASP ZAP baseline (web)…"; \
	./scripts/security/zap_baseline.sh "$$web_url" "$(REPORTS_DIR)" || exitcode=$$?; \
	echo "→ OWASP ZAP baseline (api)…"; \
	./scripts/security/zap_baseline.sh "$$api_url/openapi.json" "$(REPORTS_DIR)" || exitcode=$$?; \
	echo "→ Cleaning up isolated stack…"; \
	docker compose -f docker-compose.test-perf.yml down -v; \
	echo "✓ Security suite done (see $(REPORTS_DIR)/)."; \
	echo "  Optional: make test-security-tls HOSTPORT=example.com:443"; \
	exit $$exitcode

# ─── Code quality ─────────────────────────────────────────────────────────────

lint:
	@echo "→ Linting backend (ruff)…"
	UV_PYTHON_PREFERENCE=managed $(VENV)/ruff check $(BACKEND_DIR)/app/ $(BACKEND_DIR)/tests/
	@echo "→ Linting frontend (eslint)…"
	cd $(FRONTEND_DIR) && npm run lint

format:
	@echo "→ Formatting backend (ruff)…"
	UV_PYTHON_PREFERENCE=managed $(VENV)/ruff format $(BACKEND_DIR)/app/ $(BACKEND_DIR)/tests/

typecheck:
	@echo "→ Type-checking frontend (tsc)…"
	cd $(FRONTEND_DIR) && npm run typecheck
	@echo "→ Type-checking backend (mypy, targeted)…"
	UV_PYTHON_PREFERENCE=managed $(VENV)/mypy \
	  --config-file $(BACKEND_DIR)/pyproject.toml \
	  $(BACKEND_DIR)/app/utils/tracking_metrics.py \
	  $(BACKEND_DIR)/app/utils/meq_scoring.py

# ─── Cleanup ──────────────────────────────────────────────────────────────────

clean:
	docker compose down -v 2>/dev/null || true
	docker compose -f docker-compose.dev.yml down -v 2>/dev/null || true
	docker compose -f docker-compose.test-integration.yml down -v 2>/dev/null || true
	docker compose -f docker-compose.test-e2e.yml down -v 2>/dev/null || true
	@echo "✓ All Docker environments stopped and cleaned."
