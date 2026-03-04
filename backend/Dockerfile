FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
 PYTHONUNBUFFERED=1 \
 PIP_NO_CACHE_DIR=1 \
 PIP_DISABLE_PIP_VERSION_CHECK=1

RUN groupadd -r appgroup && useradd -r -g appgroup appuser

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
 build-essential \
 libpq-dev \
 curl \
 && rm -rf /var/lib/apt/lists/*
ENV UV_INSTALL_DIR=/usr/local/bin
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV UV_CACHE_DIR=/tmp/uv-cache
RUN mkdir -p /tmp/uv-cache && chown -R appuser:appgroup /tmp/uv-cache

COPY pyproject.toml uv.lock ./
RUN uv sync --no-dev
RUN chown -R appuser:appgroup /tmp/uv-cache

COPY --chown=appuser:appgroup . .
RUN chown -R appuser:appgroup /app/.venv

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
 CMD curl -f http://localhost:8000/health || exit 1

ENV PATH="/app/.venv/bin:$PATH"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

FROM base AS test
USER root
RUN uv sync --extra dev
RUN chown -R appuser:appgroup /app/.venv /tmp/uv-cache
USER appuser
