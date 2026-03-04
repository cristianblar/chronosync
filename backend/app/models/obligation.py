import enum
import uuid
from sqlalchemy import (
    Column,
    String,
    Time,
    Date,
    Boolean,
    ForeignKey,
    Enum,
    DateTime,
    CheckConstraint,
    Integer,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class ObligationType(str, enum.Enum):
    WORK = "work"
    CLASS = "class"
    FAMILY = "family"
    HEALTH = "health"
    OTHER = "other"


class Obligation(Base):
    __tablename__ = "obligations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    name = Column(String(100), nullable=False)
    type = Column(Enum(ObligationType), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    days_of_week = Column(ARRAY(Integer), nullable=False)

    is_recurring = Column(Boolean, default=True)
    valid_from = Column(Date, nullable=False)
    valid_until = Column(Date, nullable=True)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="obligations")

    __table_args__ = (CheckConstraint("end_time > start_time", name="check_time_range"),)
