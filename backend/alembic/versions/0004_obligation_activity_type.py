"""add obligation activity type

Revision ID: 0004_obligation_activity_type
Revises: 0003_gap_fixes
Create Date: 2026-03-03
"""

import sqlalchemy as sa
from alembic import op

revision = "0004_obligation_activity_type"
down_revision = "0003_gap_fixes"
branch_labels = None
depends_on = None


def upgrade():
    # PostgreSQL 12+ allows ALTER TYPE ADD VALUE inside a transaction.
    # No special transaction handling (COMMIT / autocommit_block) is needed.
    op.execute(sa.text("ALTER TYPE activitytype ADD VALUE IF NOT EXISTS 'OBLIGATION'"))


def downgrade():
    # PostgreSQL does not support removing enum values; downgrade is a no-op.
    pass
