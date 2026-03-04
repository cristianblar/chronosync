"""timescale setup (no-op — TimescaleDB removed)

Revision ID: 0002_timescale
Revises: 0001_initial_schema
Create Date: 2026-02-01
"""

revision = "0002_timescale"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade():
    # TimescaleDB is no longer supported on Supabase.
    # This migration is kept as a no-op to preserve the revision chain.
    pass


def downgrade():
    pass
