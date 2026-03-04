"""gap fixes

Revision ID: 0003_gap_fixes
Revises: 0002_timescale
Create Date: 2026-02-01
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0003_gap_fixes"
down_revision = "0002_timescale"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "refresh_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("token_hash", sa.String(length=128), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
        sa.Column("replaced_by", sa.String(length=128)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("idx_refresh_token_hash", "refresh_tokens", ["token_hash"])

    op.create_table(
        "device_registrations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("player_id", sa.String(length=255), nullable=False),
        sa.Column("device_type", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("last_seen_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("player_id", name="uniq_device_player_id"),
    )

    op.create_table(
        "user_article_progress",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("content_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("educational_contents.id"), nullable=False),
        sa.Column("progress_percent", sa.Integer, server_default="0"),
        sa.Column("is_completed", sa.Boolean, server_default=sa.text("false")),
        sa.Column("last_read_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.UniqueConstraint("user_id", "content_id", name="uniq_user_content_progress"),
    )

    op.execute(
        """
        CREATE OR REPLACE FUNCTION update_education_search_vector() RETURNS trigger AS $$
        BEGIN
            NEW.search_vector :=
                to_tsvector('english', coalesce(NEW.title, '') || ' ' || coalesce(NEW.body, ''));
            RETURN NEW;
        END
        $$ LANGUAGE plpgsql;
        """
    )
    # asyncpg does not support multiple statements in one prepared statement;
    # each DDL must be its own execute() call.
    op.execute("DROP TRIGGER IF EXISTS trg_education_search_vector ON educational_contents;")
    op.execute(
        """
        CREATE TRIGGER trg_education_search_vector
        BEFORE INSERT OR UPDATE ON educational_contents
        FOR EACH ROW EXECUTE FUNCTION update_education_search_vector();
        """
    )
    op.execute(
        "UPDATE educational_contents SET search_vector = to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''));"
    )

    # TimescaleDB compression/retention policies and continuous aggregates
    # removed — Supabase no longer supports TimescaleDB.


def downgrade():
    op.execute("DROP TRIGGER IF EXISTS trg_education_search_vector ON educational_contents;")
    op.execute("DROP FUNCTION IF EXISTS update_education_search_vector;")
    op.drop_table("user_article_progress")
    op.drop_table("device_registrations")
    op.drop_index("idx_refresh_token_hash", table_name="refresh_tokens")
    op.drop_table("refresh_tokens")
