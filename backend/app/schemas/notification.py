from datetime import datetime, time
from pydantic import BaseModel
from pydantic import ConfigDict


class NotificationOut(BaseModel):
    id: str
    type: str
    title: str
    body: str
    deep_link: str | None = None
    scheduled_for: datetime
    sent_at: datetime | None = None
    read_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)


class NotificationSettings(BaseModel):
    wind_down_enabled: bool
    wind_down_minutes_before: int
    tracking_reminder_enabled: bool
    tracking_reminder_time: time | None = None
    activity_reminders_enabled: bool
    max_per_day: int
    quiet_hours_start: time | None = None
    quiet_hours_end: time | None = None
    model_config = ConfigDict(from_attributes=True)


class RegisterDeviceRequest(BaseModel):
    player_id: str
    device_type: str
