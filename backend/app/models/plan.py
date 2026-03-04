import enum
import uuid
from sqlalchemy import (
    Column,
    String,
    Time,
    Date,
    Boolean,
    Float,
    ForeignKey,
    Enum,
    Integer,
    DateTime,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class ActivityType(str, enum.Enum):
    SLEEP = "sleep"
    WAKE = "wake"
    MEAL = "meal"
    EXERCISE = "exercise"
    CAFFEINE = "caffeine"
    LIGHT_EXPOSURE = "light_exposure"
    WIND_DOWN = "wind_down"
    OBLIGATION = "obligation"


class SleepPlan(Base):
    __tablename__ = "sleep_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    name = Column(String(100), default="Weekly Plan")
    valid_from = Column(Date, nullable=False)
    valid_until = Column(Date, nullable=False)

    target_sleep_time = Column(Time, nullable=False)
    target_wake_time = Column(Time, nullable=False)
    target_sleep_duration_minutes = Column(Integer, default=480)

    is_transition_plan = Column(Boolean, default=False)
    optimization_score = Column(Float, nullable=True)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="plans")
    daily_schedules = relationship(
        "DailySchedule", back_populates="plan", cascade="all, delete-orphan"
    )


class DailySchedule(Base):
    __tablename__ = "daily_schedules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("sleep_plans.id"), nullable=False)

    date = Column(Date, nullable=False)
    day_of_week = Column(Integer, nullable=False)

    sleep_time = Column(Time, nullable=False)
    wake_time = Column(Time, nullable=False)
    notes = Column(String(500), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    plan = relationship("SleepPlan", back_populates="daily_schedules")
    items = relationship("ScheduleItem", back_populates="schedule", cascade="all, delete-orphan")

    __table_args__ = (UniqueConstraint("plan_id", "date", name="unique_plan_date"),)


class ScheduleItem(Base):
    __tablename__ = "schedule_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    daily_schedule_id = Column(UUID(as_uuid=True), ForeignKey("daily_schedules.id"), nullable=False)

    activity_type = Column(Enum(ActivityType), nullable=False)
    scheduled_time = Column(Time, nullable=False)
    duration_minutes = Column(Integer, nullable=True)

    notes = Column(String(255), nullable=True)
    scientific_rationale = Column(String(500), nullable=True)

    schedule = relationship("DailySchedule", back_populates="items")
