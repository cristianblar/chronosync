from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.dependencies import get_db
from app.models.plan import DailySchedule, SleepPlan
from app.models.tracking import DailyTracking, EnergyLog, TimeOfDay
from app.models.user import User
from app.repositories.tracking_repository import TrackingRepository
from app.schemas.tracking import TrackingCreate
from app.services.tracking_service import TrackingService
from app.utils.tracking_metrics import adherence_percentage, midpoint_deviation_minutes

router = APIRouter()
repo = TrackingRepository()
service = TrackingService()


@router.post("", status_code=201)
async def submit_tracking(
    payload: TrackingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tracking = DailyTracking(
        user_id=current_user.id,
        date=payload.date or date.today(),
        actual_sleep_time=payload.actual_sleep_time,
        actual_wake_time=payload.actual_wake_time,
        sleep_quality=payload.sleep_quality,
        notes=payload.notes,
    )
    db.add(tracking)
    await db.commit()
    await db.refresh(tracking)

    # Derive metrics if we have actual sleep/wake times and a planned schedule for that date.
    if tracking.actual_sleep_time and tracking.actual_wake_time:
        planned_res = await db.execute(
            select(DailySchedule)
            .join(SleepPlan, SleepPlan.id == DailySchedule.plan_id)
            .where(
                SleepPlan.user_id == current_user.id,
                SleepPlan.is_active.is_(True),
                DailySchedule.date == tracking.date,
            )
        )
        planned = planned_res.scalar_one_or_none()
        if planned:
            tracking.adherence_percentage = adherence_percentage(
                planned_sleep=planned.sleep_time,
                planned_wake=planned.wake_time,
                actual_sleep=tracking.actual_sleep_time,
                actual_wake=tracking.actual_wake_time,
            )
            tracking.social_jet_lag_minutes = midpoint_deviation_minutes(
                planned_sleep=planned.sleep_time,
                planned_wake=planned.wake_time,
                actual_sleep=tracking.actual_sleep_time,
                actual_wake=tracking.actual_wake_time,
            )
            await db.commit()
            await db.refresh(tracking)

    if payload.energy_levels:
        for key, val in payload.energy_levels.items():
            try:
                tod = TimeOfDay(key)
            except Exception:
                continue
            db.add(
                EnergyLog(
                    tracking_id=tracking.id,
                    user_id=current_user.id,
                    time_of_day=tod,
                    energy_level=val,
                )
            )
        await db.commit()

    return {"tracking": jsonable_encoder(tracking)}


@router.get("/today")
async def tracking_today(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    t = await repo.get_by_date(db, current_user.id, date.today())
    return {"tracking": jsonable_encoder(t), "is_complete": bool(t)}


@router.get("/history")
async def tracking_history(
    start_date: date,
    end_date: date,
    limit: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = await service.history(db, current_user.id, start_date, end_date, limit)
    return {"trackings": jsonable_encoder(rows)}


@router.get("/metrics")
async def tracking_metrics(
    period: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if period:
        days = {"7d": 7, "30d": 30, "90d": 90}.get(period)
        if not days:
            raise HTTPException(status_code=400, detail="Invalid period")
        end_date = date.today()
        start_date = end_date - timedelta(days=days - 1)
    if not start_date or not end_date:
        raise HTTPException(status_code=400, detail="start_date and end_date required")
    metrics = await service.metrics(db, current_user.id, start_date, end_date)
    return {"metrics": metrics}


@router.get("/export")
async def export_tracking(
    format: str,
    start_date: date,
    end_date: date,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = await service.history(db, current_user.id, start_date, end_date, limit=1000)
    data = jsonable_encoder(rows)
    if format == "json":
        return {"data": data}
    if format == "csv":
        header = "date,actual_sleep_time,actual_wake_time,sleep_quality"
        lines = [
            f"{r.get('date')},{r.get('actual_sleep_time')},{r.get('actual_wake_time')},{r.get('sleep_quality')}"
            for r in data
        ]
        csv_body = header + "\n" + "\n".join(lines)
        return Response(content=csv_body, media_type="text/csv")
    raise HTTPException(status_code=400, detail="unsupported format")
