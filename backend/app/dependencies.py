from redis import asyncio as aioredis
from app.db.session import get_db  # noqa: F401 — re-exported for API routes
from app.config import settings


async def get_redis():
    return aioredis.from_url(settings.REDIS_URL, decode_responses=True)
