import enum
import uuid
from sqlalchemy import (
    Column,
    Integer,
    Time,
    Date,
    String,
    Float,
    ForeignKey,
    Enum,
    DateTime,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class TimeOfDay(str, enum.Enum):
    EARLY_MORNING = "early_morning"
    MORNING = "morning"
    MIDDAY = "midday"
    AFTERNOON = "afternoon"
    EVENING = "evening"
    NIGHT = "night"


class DailyTracking(Base):
    __tablename__ = "daily_trackings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    date = Column(Date, nullable=False)

    actual_sleep_time = Column(Time, nullable=True)
    actual_wake_time = Column(Time, nullable=True)
    sleep_quality = Column(Integer, nullable=True)

    adherence_percentage = Column(Float, nullable=True)
    social_jet_lag_minutes = Column(Integer, nullable=True)

    notes = Column(String(500), nullable=True)

    tracked_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="trackings")
    energy_logs = relationship("EnergyLog", back_populates="tracking", cascade="all, delete-orphan")

    __table_args__ = (UniqueConstraint("user_id", "date", name="unique_user_date"),)


class EnergyLog(Base):
    __tablename__ = "energy_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tracking_id = Column(UUID(as_uuid=True), ForeignKey("daily_trackings.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    time_of_day = Column(Enum(TimeOfDay), nullable=False)
    energy_level = Column(Integer, nullable=False)

    logged_at = Column(DateTime(timezone=True), server_default=func.now())

    tracking = relationship("DailyTracking", back_populates="energy_logs")
