from datetime import timedelta, time
from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.event import Event, EventType
from app.models.plan import SleepPlan, DailySchedule
from app.services.plan_service import PlanService
from app.schemas.event import EventCreate, EventUpdate

router = APIRouter()
plan_service = PlanService()


@router.get("")
async def list_events(
    include_past: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = Event.__table__.select().where(Event.user_id == current_user.id)
    if not include_past:
        from datetime import date

        query = query.where(Event.event_date >= date.today())
    res = await db.execute(query)
    rows = res.mappings().all()
    return {"events": jsonable_encoder(rows)}


@router.post("", status_code=201)
async def create_event(
    payload: EventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = Event(
        user_id=current_user.id,
        name=payload.name,
        type=EventType(payload.type),
        event_date=payload.event_date,
        event_time=payload.event_time,
        importance=payload.importance,
        notes=payload.notes,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    preparation_plan = None
    if event.importance >= 4:
        current_plan = await plan_service.get_current(db, current_user.id)
        target_sleep = current_plan.target_sleep_time if current_plan else time(23, 0)
        target_wake = current_plan.target_wake_time if current_plan else time(7, 0)
        start_date = event.event_date - timedelta(days=event.preparation_days)
        end_date = event.event_date - timedelta(days=1)
        plan = SleepPlan(
            user_id=current_user.id,
            name=f"Event prep: {event.name}",
            valid_from=start_date,
            valid_until=end_date,
            target_sleep_time=target_sleep,
            target_wake_time=target_wake,
            is_transition_plan=True,
        )
        db.add(plan)
        await db.commit()
        await db.refresh(plan)
        day = start_date
        while day <= end_date:
            db.add(
                DailySchedule(
                    plan_id=plan.id,
                    date=day,
                    day_of_week=day.weekday(),
                    sleep_time=target_sleep,
                    wake_time=target_wake,
                )
            )
            day += timedelta(days=1)
        await db.commit()
        preparation_plan = plan
    return {
        "event": jsonable_encoder(event),
        "preparation_plan": jsonable_encoder(preparation_plan),
    }


@router.put("/{event_id}")
async def update_event(
    event_id: str,
    payload: EventUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await db.get(Event, event_id)
    if not event or event.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(event, field, value)
    await db.commit()
    await db.refresh(event)
    return {"event": jsonable_encoder(event)}


@router.delete("/{event_id}", status_code=204)
async def delete_event(
    event_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await db.get(Event, event_id)
    if not event or event.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Not found")
    await db.delete(event)
    await db.commit()
    return None
