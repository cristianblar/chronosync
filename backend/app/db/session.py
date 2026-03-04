import ssl as _ssl

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.config import settings

# Supabase (and most managed Postgres providers) require TLS connections.
# asyncpg doesn't parse ?sslmode= from the URL, so we pass an SSLContext
# explicitly when the environment is not local/test.
_connect_args: dict = {}
if settings.ENVIRONMENT not in ("test", "local"):
    _ctx = _ssl.create_default_context()
    _ctx.check_hostname = False
    _ctx.verify_mode = _ssl.CERT_NONE
    _connect_args["ssl"] = _ctx

engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    echo=settings.DEBUG,
    connect_args=_connect_args,
)

async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    async with async_session() as session:
        yield session
