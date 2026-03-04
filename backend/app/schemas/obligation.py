from datetime import date, time
from pydantic import BaseModel
from pydantic import ConfigDict


class ObligationBase(BaseModel):
    name: str
    type: str
    start_time: time
    end_time: time
    days_of_week: list[int]
    is_recurring: bool = True
    valid_from: date
    valid_until: date | None = None


class ObligationCreate(ObligationBase):
    pass


class ObligationUpdate(ObligationBase):
    pass


class ObligationOut(ObligationBase):
    id: str
    is_active: bool
    model_config = ConfigDict(from_attributes=True)


class GoogleCalendarImportRequest(BaseModel):
    access_token: str
    calendar_id: str
    start_date: date
    end_date: date
