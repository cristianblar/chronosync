import uuid
import time
import logging
from fastapi import Request, HTTPException
from redis import asyncio as aioredis
from starlette.middleware.base import BaseHTTPMiddleware
from app.config import settings
from app.core.security import decode_token

logger = logging.getLogger("app.audit")


class RateLimiter:
    def __init__(self, redis: aioredis.Redis, requests: int = 100, window: int = 60):
        self.redis = redis
        self.requests = requests
        self.window = window

    async def is_rate_limited(self, key: str) -> bool:
        current = await self.redis.get(key)
        if current is None:
            await self.redis.setex(key, self.window, 1)
            return False
        if int(current) >= self.requests:
            return True
        await self.redis.incr(key)
        return False


async def rate_limit_middleware(request: Request, call_next):
    if settings.DISABLE_RATE_LIMIT:
        return await call_next(request)
    if request.url.path.startswith("/health") or request.url.path.startswith("/metrics"):
        return await call_next(request)
    redis = getattr(request.app.state, "redis", None)
    created_local = False
    if redis is None:
        redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        created_local = True
    overrides = settings.RATE_LIMIT_OVERRIDES or {}
    limit = settings.RATE_LIMIT_REQUESTS
    for prefix, val in overrides.items():
        if request.url.path.startswith(prefix):
            limit = val
            break
    limiter = RateLimiter(
        redis,
        requests=limit,
        window=settings.RATE_LIMIT_WINDOW_SECONDS,
    )
    client_ip = request.client.host if request.client else "unknown"
    auth = request.headers.get("Authorization", "")
    user_key = None
    if auth.startswith("Bearer "):
        token = auth.split(" ", 1)[1]
        try:
            payload = decode_token(token)
            if payload.get("type") == "access":
                user_key = payload.get("sub")
        except Exception:
            user_key = None
    key = f"rate_limit:{user_key or client_ip}"
    if await limiter.is_rate_limited(key):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again later.")
    response = await call_next(request)
    if created_local:
        await redis.close()
    return response


class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        start = time.time()
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        user_id = getattr(request.state, "user_id", None)
        duration_ms = int((time.time() - start) * 1000)
        logger.info(
            "request",
            extra={
                "request_id": request_id,
                "user_id": user_id,
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "duration_ms": duration_ms,
            },
        )
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Only meaningful over HTTPS.
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        # Cross-origin isolation hardening (safe defaults; prevents some side-channel attacks).
        response.headers["Cross-Origin-Resource-Policy"] = "same-origin"
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"

        # API responses are mostly JSON, so keep CSP simple.
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
        return response
