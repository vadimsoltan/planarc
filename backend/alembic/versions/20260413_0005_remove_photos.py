"""Remove progress photo storage."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260413_0005"
down_revision = "20260412_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index("ix_progress_photos_pose", table_name="progress_photos")
    op.drop_index("ix_progress_photos_user_date", table_name="progress_photos")
    op.drop_table("progress_photos")


def downgrade() -> None:
    op.create_table(
        "progress_photos",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("pose_type", sa.String(length=30), nullable=False),
        sa.Column("file_path", sa.String(length=255), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_progress_photos_user_date", "progress_photos", ["user_id", "date"], unique=False)
    op.create_index("ix_progress_photos_pose", "progress_photos", ["user_id", "pose_type"], unique=False)
