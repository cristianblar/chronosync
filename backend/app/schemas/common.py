from datetime import datetime
from pydantic import BaseModel


class Message(BaseModel):
    message: str


class Pagination(BaseModel):
    total: int
    limit: int
    offset: int


class HealthCheck(BaseModel):
    status: str
    checks: dict[str, str] | None = None
    timestamp: datetime | None = None
