import uuid
from datetime import timedelta
from redis import asyncio as aioredis

from app.config import settings
from app.core.security import create_token, decode_token


class TokenService:
    def __init__(self):
        self.redis_url = settings.REDIS_URL

    async def _get_redis(self):
        return aioredis.from_url(self.redis_url, decode_responses=True)

    async def create_one_time_token(
        self, user_id: str, token_type: str, expires_minutes: int
    ) -> str:
        redis = await self._get_redis()
        jti = str(uuid.uuid4())
        token = create_token(user_id, token_type, timedelta(minutes=expires_minutes))
        key = f"token:{token_type}:{jti}"
        await redis.setex(key, expires_minutes * 60, user_id)
        await redis.close()
        return f"{token}.{jti}"

    async def consume_one_time_token(self, token_with_jti: str, token_type: str) -> str | None:
        try:
            token, jti = token_with_jti.rsplit(".", 1)
        except ValueError:
            return None
        try:
            payload = decode_token(token)
        except Exception:
            return None
        if payload.get("type") != token_type:
            return None
        key = f"token:{token_type}:{jti}"
        redis = await self._get_redis()
        user_id = await redis.get(key)
        if not user_id:
            await redis.close()
            return None
        await redis.delete(key)
        await redis.close()
        return user_id

    async def close(self):
        return None
