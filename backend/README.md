# ChronoSync Backend

## Local setup (uv)

```sh
uv venv
source .venv/bin/activate
uv sync
```

## Run API

```sh
uvicorn app.main:app --reload
```
## Docker Compose (app + services)
## Docker (DBs)

```sh
docker compose up -d --build
```

## Makefile shortcuts (repo root)

```sh
make install
make infra-up
make dev-api
make dev-web
make up
make down
make migrate
make seed
make test-unit
make test-integration
make test-e2e
make lint
make format
make typecheck
```

## Tests

```sh
# Unit tests (no DB/Redis required)
make test-unit-back

# Performance (self-contained)
make test-perf

# Performance (against a running stack)
make test-perf-back API_URL=http://localhost:8000
make test-perf-plan

# Basic security unit tests
make test-security-back

# Integration/E2E tests (DB/Redis required, Dockerized)
make test-integration
make test-e2e
```
