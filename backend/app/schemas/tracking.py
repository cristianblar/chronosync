import datetime
from typing import Optional, Dict
from pydantic import BaseModel
from pydantic import ConfigDict


class TrackingCreate(BaseModel):
    date: Optional[datetime.date] = None
    actual_sleep_time: Optional[datetime.time] = None
    actual_wake_time: Optional[datetime.time] = None
    sleep_quality: Optional[int] = None
    energy_levels: Optional[Dict[str, int]] = None
    notes: Optional[str] = None


class TrackingOut(BaseModel):
    id: str
    date: datetime.date
    actual_sleep_time: Optional[datetime.time] = None
    actual_wake_time: Optional[datetime.time] = None
    sleep_quality: Optional[int] = None
    adherence_percentage: Optional[float] = None
    social_jet_lag_minutes: Optional[int] = None
    notes: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)
