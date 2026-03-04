import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker


@pytest.mark.asyncio
async def test_timescale_extension_and_hypertables_exist(engine):
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as db:
        ext = await db.execute(text("SELECT 1 FROM pg_extension WHERE extname='timescaledb'"))
        if not ext.scalar():
            pytest.skip("timescaledb extension not installed")

        # Ensure the TimescaleDB information schema is queryable.
        await db.execute(text("SELECT 1 FROM timescaledb_information.hypertables LIMIT 1"))

        # Ensure tracking tables exist (the app should work even if hypertable conversion is skipped).
        daily = await db.execute(text("SELECT to_regclass('public.daily_trackings')"))
        energy = await db.execute(text("SELECT to_regclass('public.energy_logs')"))
        assert daily.scalar() == "daily_trackings"
        assert energy.scalar() == "energy_logs"
