from datetime import datetime, date
import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Body, Query
from fastapi.encoders import jsonable_encoder
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.security import get_current_user
from app.dependencies import get_db
from app.models.user import User
from app.models.obligation import Obligation, ObligationType
from app.schemas.obligation import (
    ObligationCreate,
    ObligationUpdate,
    GoogleCalendarImportRequest,
)
from app.repositories.obligation_repository import ObligationRepository

router = APIRouter()
repo = ObligationRepository()


@router.get("")
async def list_obligations(
    active_only: bool = True,
    include_expired: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obligations = await repo.list(
        db, current_user.id, active_only=active_only, include_expired=include_expired
    )
    return {"obligations": jsonable_encoder(obligations)}


@router.post("", status_code=201)
async def create_obligation(
    payload: ObligationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obligation = Obligation(
        user_id=current_user.id,
        name=payload.name,
        type=ObligationType(payload.type),
        start_time=payload.start_time,
        end_time=payload.end_time,
        days_of_week=payload.days_of_week,
        is_recurring=payload.is_recurring,
        valid_from=payload.valid_from,
        valid_until=payload.valid_until,
    )
    db.add(obligation)
    await db.commit()
    await db.refresh(obligation)
    return {"obligation": jsonable_encoder(obligation)}


@router.get("/{obligation_id}")
async def get_obligation(
    obligation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obligation = await db.get(Obligation, obligation_id)
    if not obligation or obligation.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Not found")
    return {"obligation": jsonable_encoder(obligation)}


@router.put("/{obligation_id}")
async def update_obligation(
    obligation_id: str,
    payload: ObligationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obligation = await db.get(Obligation, obligation_id)
    if not obligation or obligation.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obligation, field, value)
    await db.commit()
    await db.refresh(obligation)
    return {"obligation": jsonable_encoder(obligation)}


@router.delete("/{obligation_id}", status_code=204)
async def delete_obligation(
    obligation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obligation = await db.get(Obligation, obligation_id)
    if not obligation or obligation.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Not found")
    await db.delete(obligation)
    await db.commit()
    return None


@router.post("/check-conflicts")
async def check_conflicts(
    start_time: str,
    end_time: str,
    days_of_week: list[int] = Query(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obligations = await repo.list(db, current_user.id, active_only=True)
    conflicts = []
    for o in obligations:
        if any(d in (o.days_of_week or []) for d in days_of_week):
            if not (end_time <= o.start_time.isoformat() or start_time >= o.end_time.isoformat()):
                conflicts.append(o)
    return {"has_conflicts": bool(conflicts), "conflicts": jsonable_encoder(conflicts)}


_MOCK_CALENDAR_OBLIGATIONS = [
    {
        "name": "Morning standup (mock)",
        "type": "work",
        "start_time": "09:00",
        "end_time": "09:30",
        "days_of_week": [0, 1, 2, 3, 4],
    },
    {
        "name": "Gym (mock)",
        "type": "health",
        "start_time": "18:00",
        "end_time": "19:30",
        "days_of_week": [1, 3],
    },
]


@router.post("/import-google-calendar")
async def import_google_calendar(
    request: Request,
    payload: GoogleCalendarImportRequest | None = Body(default=None),
    x_mock_calendar: str | None = Header(default=None, alias="X-Mock-Calendar"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Backwards compat: older clients passed these as query params.
    # We read them from request.query_params WITHOUT declaring them as FastAPI params,
    # so they won't show up in OpenAPI (and ZAP won't flag tokens in URL from docs).
    qp = request.query_params

    access_token = (payload.access_token if payload else None) or qp.get("access_token")
    calendar_id = (payload.calendar_id if payload else None) or qp.get("calendar_id")

    start_date_val = (payload.start_date if payload else None) or qp.get("start_date")
    end_date_val = (payload.end_date if payload else None) or qp.get("end_date")

    if not access_token or not calendar_id or not start_date_val or not end_date_val:
        raise HTTPException(status_code=400, detail="Missing required fields")

    if isinstance(start_date_val, str):
        start_date = date.fromisoformat(start_date_val)
    else:
        start_date = start_date_val

    if isinstance(end_date_val, str):
        end_date = date.fromisoformat(end_date_val)
    else:
        end_date = end_date_val
    if not settings.GOOGLE_CLIENT_ID:
        if x_mock_calendar:
            # Return sample obligations for local development
            today = date.today()
            obligations = []
            for mock in _MOCK_CALENDAR_OBLIGATIONS:
                from datetime import time as dtime

                st = dtime(*map(int, mock["start_time"].split(":")))
                et = dtime(*map(int, mock["end_time"].split(":")))
                obligation = Obligation(
                    user_id=current_user.id,
                    name=mock["name"],
                    type=ObligationType(mock["type"]),
                    start_time=st,
                    end_time=et,
                    days_of_week=mock["days_of_week"],
                    is_recurring=True,
                    valid_from=today,
                )
                db.add(obligation)
                obligations.append(obligation)
            await db.commit()
            for o in obligations:
                await db.refresh(o)
            return {
                "imported": len(obligations),
                "obligations": jsonable_encoder(obligations),
                "mock": True,
            }
        raise HTTPException(
            status_code=501,
            detail="Google Calendar integration is not configured. Set GOOGLE_CLIENT_ID to enable it.",
        )
    time_min = datetime.combine(start_date, datetime.min.time()).isoformat() + "Z"
    time_max = datetime.combine(end_date, datetime.max.time()).isoformat() + "Z"
    url = f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events"
    params = {
        "timeMin": time_min,
        "timeMax": time_max,
        "singleEvents": "true",
        "orderBy": "startTime",
    }
    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params, headers=headers)
        resp.raise_for_status()
        data = resp.json()
    imported = 0
    obligations = []
    for ev in data.get("items", []):
        start = ev.get("start", {})
        end = ev.get("end", {})
        start_dt = start.get("dateTime") or start.get("date")
        end_dt = end.get("dateTime") or end.get("date")
        if not start_dt or not end_dt:
            continue

        def parse_dt(v: str) -> datetime:
            if v.endswith("Z"):
                v = v.replace("Z", "+00:00")
            return datetime.fromisoformat(v)

        sdt = parse_dt(start_dt)
        edt = parse_dt(end_dt)
        obligation = Obligation(
            user_id=current_user.id,
            name=ev.get("summary") or "Calendar Event",
            type=ObligationType.OTHER,
            start_time=sdt.time(),
            end_time=edt.time(),
            days_of_week=[sdt.weekday()],
            is_recurring=False,
            valid_from=sdt.date(),
            valid_until=sdt.date(),
        )
        db.add(obligation)
        obligations.append(obligation)
        imported += 1
    await db.commit()
    for o in obligations:
        await db.refresh(o)
    return {"imported": imported, "obligations": jsonable_encoder(obligations)}
