from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.dependencies import get_db
from app.models.user import User
from app.schemas.plan import PlanGenerateRequest, TransitionPlanRequest
from app.services.plan_service import PlanService
from app.models.plan import SleepPlan, DailySchedule, ScheduleItem

router = APIRouter()
service = PlanService()


async def _plan_with_schedules(db: AsyncSession, plan_id):
    plan = await db.get(SleepPlan, plan_id)
    if not plan:
        return None
    schedules_res = await db.execute(select(DailySchedule).where(DailySchedule.plan_id == plan.id))
    schedules = []
    for schedule in schedules_res.scalars().all():
        items_res = await db.execute(
            select(ScheduleItem).where(ScheduleItem.daily_schedule_id == schedule.id)
        )
        items = list(items_res.scalars().all())
        schedules.append({"schedule": schedule, "items": items})
    return plan, schedules


def _serialize_item(item: ScheduleItem):
    return {
        "activity_type": getattr(item.activity_type, "value", item.activity_type),
        "scheduled_time": item.scheduled_time,
        "duration_minutes": item.duration_minutes,
        "notes": item.notes,
        "scientific_rationale": item.scientific_rationale,
    }


@router.post("/generate", status_code=201)
async def generate_plan(
    payload: PlanGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        result, plan = await service.generate_plan(db, current_user.id, payload.start_date)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    schedules = []
    for s in result.schedules:
        schedules.append(
            {
                "date": s.date,
                "day_of_week": s.day_of_week,
                "sleep_time": s.sleep_time,
                "wake_time": s.wake_time,
                "items": [
                    {
                        "activity_type": getattr(i.activity_type, "value", i.activity_type),
                        "scheduled_time": i.scheduled_time,
                        "duration_minutes": i.duration_minutes,
                        "notes": i.notes,
                        "scientific_rationale": i.scientific_rationale,
                    }
                    for i in s.items
                ],
            }
        )
    return {
        "plan": jsonable_encoder(plan),
        "schedules": schedules,
        "optimization_details": {
            "score": result.optimization_score,
            "generation_time_ms": result.generation_time_ms,
        },
    }


@router.post("/transition", status_code=201)
async def transition_plan(
    payload: TransitionPlanRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        plan, schedules = await service.generate_transition_plan(
            db,
            current_user.id,
            payload.target_wake_time,
            payload.target_sleep_time,
            payload.max_daily_shift_minutes,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"plan": jsonable_encoder(plan), "schedules": jsonable_encoder(schedules)}


@router.get("/current")
async def current_plan(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = await service.get_current(db, current_user.id)
    if not plan:
        return {"plan": None, "schedules": []}
    res = await _plan_with_schedules(db, plan.id)
    if not res:
        return {"plan": None, "schedules": []}
    plan_obj, schedules = res
    return {
        "plan": jsonable_encoder(plan_obj),
        "schedules": [
            {
                "date": s["schedule"].date,
                "day_of_week": s["schedule"].day_of_week,
                "sleep_time": s["schedule"].sleep_time,
                "wake_time": s["schedule"].wake_time,
                "items": [_serialize_item(i) for i in s["items"]],
            }
            for s in schedules
        ],
    }


@router.get("/history")
async def plan_history(
    limit: int = 10,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res = await db.execute(
        SleepPlan.__table__.select()
        .where(SleepPlan.user_id == current_user.id)
        .order_by(SleepPlan.valid_from.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = res.mappings().all()
    return {"plans": jsonable_encoder(rows), "total": len(rows)}


@router.get("/today")
async def today_schedule(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    res = await db.execute(
        select(DailySchedule)
        .join(SleepPlan, SleepPlan.id == DailySchedule.plan_id)
        .where(SleepPlan.user_id == current_user.id, DailySchedule.date == today)
    )
    schedule = res.scalar_one_or_none()
    if not schedule:
        return {"schedule": None, "items": [], "next_activity": None, "countdown_minutes": None}
    items_res = await db.execute(
        select(ScheduleItem).where(ScheduleItem.daily_schedule_id == schedule.id)
    )
    items = list(items_res.scalars().all())
    now = datetime.utcnow().time()

    def minutes(t):
        return t.hour * 60 + t.minute

    now_min = minutes(now)
    future_items = [i for i in items if minutes(i.scheduled_time) > now_min]
    next_item = sorted(future_items, key=lambda i: i.scheduled_time)[0] if future_items else None
    countdown = None
    if next_item:
        countdown = minutes(next_item.scheduled_time) - now_min
    return {
        "schedule": jsonable_encoder(schedule),
        "items": [_serialize_item(i) for i in items],
        "next_activity": _serialize_item(next_item) if next_item else None,
        "countdown_minutes": countdown,
    }


@router.get("/{plan_id}")
async def get_plan(
    plan_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res = await _plan_with_schedules(db, plan_id)
    if not res:
        raise HTTPException(status_code=404, detail="Not found")
    plan_obj, schedules = res
    if plan_obj.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Not found")
    return {
        "plan": jsonable_encoder(plan_obj),
        "schedules": [
            {
                "date": s["schedule"].date,
                "day_of_week": s["schedule"].day_of_week,
                "sleep_time": s["schedule"].sleep_time,
                "wake_time": s["schedule"].wake_time,
                "items": [_serialize_item(i) for i in s["items"]],
            }
            for s in schedules
        ],
    }
