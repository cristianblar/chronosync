import os
import pytest
import asyncio
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from contextlib import asynccontextmanager

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5433/test_db"
)
TEST_REDIS_URL = os.getenv("TEST_REDIS_URL", "redis://localhost:6380/0")
os.environ.setdefault("DATABASE_URL", TEST_DATABASE_URL)
os.environ.setdefault("REDIS_URL", TEST_REDIS_URL)
os.environ.setdefault("JWT_SECRET_KEY", os.getenv("TEST_JWT_SECRET_KEY", "testsecret"))
os.environ.setdefault("ENABLE_SCHEDULER", "false")
os.environ.setdefault("DISABLE_RATE_LIMIT", "true")

from app.db.base import Base  # noqa: E402
from app.dependencies import get_db  # noqa: E402
from app.db.session import get_db as get_db_session  # noqa: E402


@pytest.fixture(scope="session")
def engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False, poolclass=NullPool)
    asyncio.run(_wait_for_db(engine))
    asyncio.run(_create_all(engine))
    yield engine
    asyncio.run(_drop_all(engine))
    asyncio.run(engine.dispose())


async def _create_all(engine):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def _drop_all(engine):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def _wait_for_db(engine, retries: int = 30, delay: float = 0.5):
    last_exc = None
    for _ in range(retries):
        try:
            async with engine.begin() as conn:
                await conn.execute(text("SELECT 1"))
            return
        except Exception as exc:
            last_exc = exc
            await asyncio.sleep(delay)
    if last_exc:
        raise last_exc


@pytest.fixture
def client(engine):
    from app.main import app

    @asynccontextmanager
    async def _noop_lifespan(app_instance):
        yield

    app.router.lifespan_context = _noop_lifespan
    asyncio.run(_create_all(engine))

    async def override_get_db():
        async_session_local = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with async_session_local() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_db_session] = override_get_db
    with TestClient(app) as tc:
        yield tc
    app.dependency_overrides.clear()


@pytest.fixture
def sample_user_data():
    unique_email = f"test+{uuid.uuid4().hex}@example.com"
    return {"email": unique_email, "password": "TestPass123", "name": "Test User"}


@pytest.fixture
def sample_meq_responses():
    return {f"q{i}": 3 for i in range(1, 20)}
