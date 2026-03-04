from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from redis import asyncio as aioredis
from starlette.responses import JSONResponse

from app.dependencies import get_db, get_redis

router = APIRouter()


@router.get("/health")
async def health_check(
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    health = {"status": "healthy", "checks": {}}
    try:
        await db.execute(text("SELECT 1"))
        health["checks"]["database"] = "ok"
    except Exception as e:
        health["checks"]["database"] = f"error: {e}"
        health["status"] = "unhealthy"
    try:
        await redis.ping()
        health["checks"]["redis"] = "ok"
    except Exception as e:
        health["checks"]["redis"] = f"error: {e}"
        health["status"] = "unhealthy"
    status_code = 200 if health["status"] == "healthy" else 503
    return JSONResponse(content=health, status_code=status_code)


@router.get("/health/ready")
async def readiness_check(
    db: AsyncSession = Depends(get_db),
):
    try:
        res = await db.execute(text("SELECT version_num FROM alembic_version"))
        _ = res.scalar_one_or_none()
        return {"status": "ready"}
    except Exception as e:
        return JSONResponse(content={"status": f"not_ready: {e}"}, status_code=503)


@router.get("/health/live")
async def liveness_check():
    return {"status": "alive"}
