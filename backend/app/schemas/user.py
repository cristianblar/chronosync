from datetime import datetime
import uuid
from pydantic import BaseModel, EmailStr
from pydantic import ConfigDict


class UserBase(BaseModel):
    email: EmailStr
    name: str
    timezone: str = "UTC"
    language: str = "es"


class UserOut(UserBase):
    id: uuid.UUID
    is_active: bool
    is_verified: bool
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    name: str | None = None
    timezone: str | None = None
    language: str | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ConsentUpdate(BaseModel):
    analytics_consent: bool
    marketing_consent: bool
    research_consent: bool


class DeleteAccountRequest(BaseModel):
    current_password: str | None = None
