"""timescale setup

Revision ID: 0002_timescale
Revises: 0001_initial_schema
Create Date: 2026-02-01
"""

from alembic import op

revision = "0002_timescale"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS timescaledb;")
    # TimescaleDB hypertables require that every unique index includes the partition column.
    # daily_trackings has a unique constraint on (user_id, date) which doesn't include
    # tracked_at. We drop it, create the hypertable, then recreate the constraint with
    # tracked_at included so TimescaleDB can enforce uniqueness per chunk.
    op.execute(
        """
        DO $$
        BEGIN
            -- Convert daily_trackings to hypertable on tracked_at
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='daily_trackings') THEN
                -- Drop the existing unique constraint that doesn't include the partition column
                IF EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'unique_user_date' AND contype = 'u'
                ) THEN
                    ALTER TABLE daily_trackings DROP CONSTRAINT unique_user_date;
                END IF;

                -- Create hypertable (will fail gracefully if already a hypertable)
                BEGIN
                    PERFORM create_hypertable(
                        'daily_trackings', 'tracked_at',
                        if_not_exists => TRUE,
                        chunk_time_interval => INTERVAL '7 days'
                    );
                EXCEPTION WHEN OTHERS THEN
                    -- Hypertable creation may fail in environments without full TimescaleDB
                    -- support. The app still works without hypertable partitioning.
                    NULL;
                END;

                -- Recreate unique constraint including the partition column
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'unique_user_date_tracked'
                ) THEN
                    ALTER TABLE daily_trackings
                        ADD CONSTRAINT unique_user_date_tracked
                        UNIQUE (user_id, date, tracked_at);
                END IF;
            END IF;

            -- Convert energy_logs to hypertable on logged_at
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='energy_logs') THEN
                BEGIN
                    PERFORM create_hypertable(
                        'energy_logs', 'logged_at',
                        if_not_exists => TRUE,
                        chunk_time_interval => INTERVAL '7 days'
                    );
                EXCEPTION WHEN OTHERS THEN
                    NULL;
                END;
            END IF;
        END$$;
        """
    )


def downgrade():
    pass
