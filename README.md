# ChronoSync

Full-stack circadian rhythm optimization app. Users complete the Morningness-Eveningness Questionnaire (MEQ), define recurring obligations, and receive a 7-day sleep schedule optimized with Google OR-Tools.

## Quick Start

**Prerequisites:** Docker and Docker Compose

```bash
# 1. Copy environment template
cp backend/.env.example backend/.env
# Edit backend/.env and set JWT_SECRET_KEY to a random string

# 2. Start all services (DB + Redis + Mailhog + API + Web)
make up

# 3. Run database migrations
make migrate

# 4. Seed education content
make seed
```

The app will be available at:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs
- **Email UI (Mailhog):** http://localhost:8025

## Services

| Service | Port | Description |
|---------|------|-------------|
| `db` | 5432 | PostgreSQL 16 + TimescaleDB |
| `redis` | 6379 | Cache & job store |
| `mailhog` | 1025/8025 | Local email capture |
| `api` | 8000 | FastAPI backend |
| `web` | 3000 | Next.js frontend |

## Development

```bash
# View logs
make logs

# Stop and remove volumes
make down

# Unit tests
make test-unit
make test-unit-back
make test-unit-front
```

## Performance & Security

```bash
# Perf (self-contained: starts an isolated Docker stack, runs Lighthouse+Locust+benchmark, then cleans up)
# Note: Lighthouse needs Chrome/Chromium; the script will auto-install Playwright Chromium if missing.
make test-perf

# Perf (against an already-running stack)
make test-perf-front WEB_URL=http://localhost:3000
make test-perf-back API_URL=http://localhost:8000

# Perf (no running services required)
make test-perf-plan

# Security (self-contained: backend security unit tests + npm audit + ZAP baseline against isolated Docker stack)
make test-security

# Optional: OWASP ZAP baseline scan (requires services running)
make test-security-zap-web WEB_URL=http://localhost:3000
make test-security-zap-api API_URL=http://localhost:8000

# Optional: TLS 1.3 negotiation (prod / HTTPS endpoint)
make test-security-tls HOSTPORT=example.com:443
```

## Architecture

- **Backend:** Python / FastAPI + SQLAlchemy async + OR-Tools optimization engine
- **Frontend:** Next.js 16 (App Router) + TypeScript + Zustand + Tailwind CSS v4
- **Database:** PostgreSQL 16 + TimescaleDB hypertables
- **Auth:** JWT access tokens + rotating refresh tokens
