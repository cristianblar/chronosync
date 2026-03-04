"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-02-01
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None

# ── PostgreSQL ENUM type definitions ──────────────────────────────────────────
# SQLAlchemy 2.x stores Python enum members by their .name (the attribute name,
# which is uppercase by convention). The PostgreSQL ENUM values must match
# exactly what SQLAlchemy sends, so we use the .name strings here.

chronotypecategory = postgresql.ENUM(
    "EXTREME_MORNING", "MODERATE_MORNING", "INTERMEDIATE",
    "MODERATE_EVENING", "EXTREME_EVENING",
    name="chronotypecategory",
    create_type=False,
)
obligationtype = postgresql.ENUM(
    "WORK", "CLASS", "FAMILY", "HEALTH", "OTHER",
    name="obligationtype",
    create_type=False,
)
activitytype = postgresql.ENUM(
    "SLEEP", "WAKE", "MEAL", "EXERCISE", "CAFFEINE", "LIGHT_EXPOSURE", "WIND_DOWN",
    name="activitytype",
    create_type=False,
)
notificationtype = postgresql.ENUM(
    "WIND_DOWN", "TRACKING_REMINDER", "ACTIVITY", "EVENT_PREP", "MILESTONE",
    name="notificationtype",
    create_type=False,
)
timeofday = postgresql.ENUM(
    "EARLY_MORNING", "MORNING", "MIDDAY", "AFTERNOON", "EVENING", "NIGHT",
    name="timeofday",
    create_type=False,
)
eventtype = postgresql.ENUM(
    "EXAM", "PRESENTATION", "INTERVIEW", "TRAVEL", "OTHER",
    name="eventtype",
    create_type=False,
)


def upgrade():
    # Create all ENUM types first (before any table that references them)
    chronotypecategory.create(op.get_bind(), checkfirst=True)
    obligationtype.create(op.get_bind(), checkfirst=True)
    activitytype.create(op.get_bind(), checkfirst=True)
    notificationtype.create(op.get_bind(), checkfirst=True)
    timeofday.create(op.get_bind(), checkfirst=True)
    eventtype.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255)),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("timezone", sa.String(length=50), server_default="UTC"),
        sa.Column("language", sa.String(length=5), server_default="es"),
        sa.Column("oauth_provider", sa.String(length=20)),
        sa.Column("oauth_id", sa.String(length=255)),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("is_verified", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("analytics_consent", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("marketing_consent", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("research_consent", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
        sa.Column("last_login_at", sa.DateTime(timezone=True)),
    )
    op.create_index("idx_user_email", "users", ["email"], unique=True)
    op.create_index(
        "idx_user_oauth",
        "users",
        ["oauth_provider", "oauth_id"],
        unique=False,
        postgresql_where=sa.text("oauth_provider IS NOT NULL"),
    )

    op.create_table(
        "chronotype_assessments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("responses", postgresql.JSONB, nullable=False),
        sa.Column("total_score", sa.Integer, nullable=False),
        sa.Column("chronotype", chronotypecategory, nullable=False),
        sa.Column("ideal_wake_time", sa.String(length=5), nullable=False),
        sa.Column("ideal_sleep_time", sa.String(length=5), nullable=False),
        sa.Column("midpoint_of_sleep", sa.String(length=5), nullable=False),
        sa.Column("is_current", sa.Boolean, server_default=sa.text("true")),
        sa.Column("assessed_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index(
        "idx_assessment_user_current",
        "chronotype_assessments",
        ["user_id", "is_current"],
        postgresql_where=sa.text("is_current = TRUE"),
    )

    op.create_table(
        "obligations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("type", obligationtype, nullable=False),
        sa.Column("start_time", sa.Time, nullable=False),
        sa.Column("end_time", sa.Time, nullable=False),
        sa.Column("days_of_week", postgresql.ARRAY(sa.Integer), nullable=False),
        sa.Column("is_recurring", sa.Boolean, server_default=sa.text("true")),
        sa.Column("valid_from", sa.Date, nullable=False),
        sa.Column("valid_until", sa.Date),
        sa.Column("is_active", sa.Boolean, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.CheckConstraint("end_time > start_time", name="check_time_range"),
    )
    op.create_index(
        "idx_obligation_user_active",
        "obligations",
        ["user_id", "is_active", "valid_from", "valid_until"],
        postgresql_where=sa.text("is_active = TRUE"),
    )

    op.create_table(
        "sleep_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(length=100), server_default="Weekly Plan"),
        sa.Column("valid_from", sa.Date, nullable=False),
        sa.Column("valid_until", sa.Date, nullable=False),
        sa.Column("target_sleep_time", sa.Time, nullable=False),
        sa.Column("target_wake_time", sa.Time, nullable=False),
        sa.Column("target_sleep_duration_minutes", sa.Integer, server_default="480"),
        sa.Column("is_transition_plan", sa.Boolean, server_default=sa.text("false")),
        sa.Column("optimization_score", sa.Float),
        sa.Column("is_active", sa.Boolean, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index(
        "idx_plan_user_active",
        "sleep_plans",
        ["user_id", "is_active", "valid_from"],
        postgresql_where=sa.text("is_active = TRUE"),
    )

    op.create_table(
        "daily_schedules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("plan_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sleep_plans.id"), nullable=False),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("day_of_week", sa.Integer, nullable=False),
        sa.Column("sleep_time", sa.Time, nullable=False),
        sa.Column("wake_time", sa.Time, nullable=False),
        sa.Column("notes", sa.String(length=500)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.UniqueConstraint("plan_id", "date", name="unique_plan_date"),
    )
    op.create_index("idx_schedule_plan_date", "daily_schedules", ["plan_id", "date"])

    op.create_table(
        "schedule_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("daily_schedule_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("daily_schedules.id"), nullable=False),
        sa.Column("activity_type", activitytype, nullable=False),
        sa.Column("scheduled_time", sa.Time, nullable=False),
        sa.Column("duration_minutes", sa.Integer),
        sa.Column("notes", sa.String(length=255)),
        sa.Column("scientific_rationale", sa.String(length=500)),
    )

    op.create_table(
        "daily_trackings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("actual_sleep_time", sa.Time),
        sa.Column("actual_wake_time", sa.Time),
        sa.Column("sleep_quality", sa.Integer),
        sa.Column("adherence_percentage", sa.Float),
        sa.Column("social_jet_lag_minutes", sa.Integer),
        sa.Column("notes", sa.String(length=500)),
        sa.Column("tracked_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.UniqueConstraint("user_id", "date", name="unique_user_date"),
    )
    op.create_index("idx_tracking_user_date", "daily_trackings", ["user_id", "date"])

    op.create_table(
        "energy_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tracking_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("daily_trackings.id"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("time_of_day", timeofday, nullable=False),
        sa.Column("energy_level", sa.Integer, nullable=False),
        sa.Column("logged_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    op.create_table(
        "educational_contents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("slug", sa.String(length=200), nullable=False),
        sa.Column("excerpt", sa.String(length=500)),
        sa.Column("body", sa.Text, nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("tags", postgresql.ARRAY(sa.String)),
        sa.Column("reading_time_minutes", sa.Integer),
        sa.Column("citations", postgresql.JSONB),
        sa.Column("target_chronotypes", postgresql.ARRAY(sa.String)),
        sa.Column("search_vector", postgresql.TSVECTOR),
        sa.Column("is_published", sa.Boolean, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )
    op.create_index("idx_education_category", "educational_contents", ["category"])
    op.create_index("idx_education_search", "educational_contents", ["search_vector"], postgresql_using="gin")
    op.create_index("idx_education_slug", "educational_contents", ["slug"], unique=True)

    op.create_table(
        "faqs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("question", sa.String(length=500), nullable=False),
        sa.Column("answer", sa.Text, nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("order", sa.Integer, server_default="0"),
        sa.Column("is_published", sa.Boolean, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("type", notificationtype, nullable=False),
        sa.Column("title", sa.String(length=100), nullable=False),
        sa.Column("body", sa.String(length=255), nullable=False),
        sa.Column("deep_link", sa.String(length=255)),
        sa.Column("content", postgresql.JSONB),
        sa.Column("scheduled_for", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True)),
        sa.Column("read_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index(
        "idx_notification_user_scheduled",
        "notifications",
        ["user_id", "scheduled_for"],
        postgresql_where=sa.text("sent_at IS NULL"),
    )

    op.create_table(
        "notification_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, unique=True),
        sa.Column("wind_down_enabled", sa.Boolean, server_default=sa.text("true")),
        sa.Column("wind_down_minutes_before", sa.Integer, server_default="60"),
        sa.Column("tracking_reminder_enabled", sa.Boolean, server_default=sa.text("true")),
        sa.Column("tracking_reminder_time", sa.Time),
        sa.Column("activity_reminders_enabled", sa.Boolean, server_default=sa.text("true")),
        sa.Column("max_per_day", sa.Integer, server_default="5"),
        sa.Column("quiet_hours_start", sa.Time),
        sa.Column("quiet_hours_end", sa.Time),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("user_id", name="uniq_notification_settings_user"),
    )

    op.create_table(
        "events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("type", eventtype, nullable=False),
        sa.Column("event_date", sa.Date, nullable=False),
        sa.Column("event_time", sa.Time),
        sa.Column("importance", sa.Integer, server_default="3"),
        sa.Column("preparation_days", sa.Integer, server_default="5"),
        sa.Column("notes", sa.String(length=500)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )


def downgrade():
    op.drop_table("events")
    op.drop_table("notification_settings")
    op.drop_table("notifications")
    op.drop_table("faqs")
    op.drop_index("idx_education_slug", table_name="educational_contents")
    op.drop_index("idx_education_search", table_name="educational_contents")
    op.drop_index("idx_education_category", table_name="educational_contents")
    op.drop_table("educational_contents")
    op.drop_table("energy_logs")
    op.drop_index("idx_tracking_user_date", table_name="daily_trackings")
    op.drop_table("daily_trackings")
    op.drop_table("schedule_items")
    op.drop_index("idx_schedule_plan_date", table_name="daily_schedules")
    op.drop_table("daily_schedules")
    op.drop_index("idx_plan_user_active", table_name="sleep_plans")
    op.drop_table("sleep_plans")
    op.drop_index("idx_obligation_user_active", table_name="obligations")
    op.drop_table("obligations")
    op.drop_index("idx_assessment_user_current", table_name="chronotype_assessments")
    op.drop_table("chronotype_assessments")
    op.drop_index("idx_user_oauth", table_name="users")
    op.drop_index("idx_user_email", table_name="users")
    op.drop_table("users")

    # Drop ENUM types last (after all tables that use them are gone)
    eventtype.drop(op.get_bind(), checkfirst=True)
    timeofday.drop(op.get_bind(), checkfirst=True)
    notificationtype.drop(op.get_bind(), checkfirst=True)
    activitytype.drop(op.get_bind(), checkfirst=True)
    obligationtype.drop(op.get_bind(), checkfirst=True)
    chronotypecategory.drop(op.get_bind(), checkfirst=True)
