from datetime import date, time
from pydantic import BaseModel
from pydantic import ConfigDict


class EventBase(BaseModel):
    name: str
    type: str
    event_date: date
    event_time: time | None = None
    importance: int = 3
    notes: str | None = None


class EventCreate(EventBase):
    pass


class EventUpdate(EventBase):
    pass


class EventOut(EventBase):
    id: str
    model_config = ConfigDict(from_attributes=True)
