from datetime import date, time
from pydantic import BaseModel
from pydantic import ConfigDict


class ScheduleItemOut(BaseModel):
    id: str | None = None
    activity_type: str
    scheduled_time: time
    duration_minutes: int | None = None
    notes: str | None = None
    scientific_rationale: str | None = None
    model_config = ConfigDict(from_attributes=True)


class DailyScheduleOut(BaseModel):
    id: str | None = None
    date: date
    day_of_week: int
    sleep_time: time
    wake_time: time
    notes: str | None = None
    items: list[ScheduleItemOut] = []
    model_config = ConfigDict(from_attributes=True)


class SleepPlanOut(BaseModel):
    id: str
    name: str
    valid_from: date
    valid_until: date
    target_sleep_time: time
    target_wake_time: time
    target_sleep_duration_minutes: int
    is_transition_plan: bool
    optimization_score: float | None = None
    model_config = ConfigDict(from_attributes=True)


class PlanGenerateRequest(BaseModel):
    start_date: date | None = None


class TransitionPlanRequest(BaseModel):
    target_wake_time: time
    target_sleep_time: time
    max_daily_shift_minutes: int = 30
