import sentry_sdk
from fastapi import FastAPI
from redis import asyncio as aioredis
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.logging import setup_logging
from app.core.middleware import (
    rate_limit_middleware,
    SecurityHeadersMiddleware,
    RequestIDMiddleware,
)
from app.core.metrics import MetricsMiddleware, router as metrics_router
from app.core.scheduler import start_scheduler
from app.api.v1.router import router as v1_router


setup_logging()

if settings.SENTRY_DSN:
    sentry_sdk.init(dsn=settings.SENTRY_DSN, environment=settings.ENVIRONMENT)

app = FastAPI(title=settings.APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=86400,
)
app.add_middleware(MetricsMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestIDMiddleware)
app.middleware("http")(rate_limit_middleware)

app.include_router(v1_router, prefix="/api/v1")
app.include_router(metrics_router)


@app.on_event("startup")
async def startup():
    app.state.redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    if settings.ENABLE_SCHEDULER:
        app.state.scheduler = start_scheduler()


@app.on_event("shutdown")
async def shutdown():
    redis = getattr(app.state, "redis", None)
    if redis:
        await redis.close()
    scheduler = getattr(app.state, "scheduler", None)
    if scheduler:
        scheduler.shutdown()
