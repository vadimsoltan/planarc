"""Add milestone 2 logging tables."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260411_0002"
down_revision = "20260411_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "daily_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("weight_kg", sa.Float(), nullable=True),
        sa.Column("calories", sa.Integer(), nullable=True),
        sa.Column("protein_g", sa.Float(), nullable=True),
        sa.Column("carbs_g", sa.Float(), nullable=True),
        sa.Column("fat_g", sa.Float(), nullable=True),
        sa.Column("steps", sa.Integer(), nullable=True),
        sa.Column("cardio_minutes", sa.Integer(), nullable=True),
        sa.Column("cardio_type", sa.String(length=120), nullable=True),
        sa.Column("sleep_hours", sa.Float(), nullable=True),
        sa.Column("is_training_day", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "date", name="uq_daily_logs_user_date"),
    )
    op.create_index("ix_daily_logs_user_date", "daily_logs", ["user_id", "date"], unique=False)

    op.create_table(
        "measurements",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("neck_cm", sa.Float(), nullable=True),
        sa.Column("waist_navel_cm", sa.Float(), nullable=True),
        sa.Column("waist_narrow_cm", sa.Float(), nullable=True),
        sa.Column("chest_cm", sa.Float(), nullable=True),
        sa.Column("hips_cm", sa.Float(), nullable=True),
        sa.Column("glutes_cm", sa.Float(), nullable=True),
        sa.Column("arm_relaxed_cm", sa.Float(), nullable=True),
        sa.Column("arm_flexed_cm", sa.Float(), nullable=True),
        sa.Column("thigh_mid_cm", sa.Float(), nullable=True),
        sa.Column("thigh_upper_cm", sa.Float(), nullable=True),
        sa.Column("calf_cm", sa.Float(), nullable=True),
        sa.Column("navy_body_fat_pct", sa.Float(), nullable=True),
        sa.Column("adjusted_body_fat_pct", sa.Float(), nullable=True),
        sa.Column("lean_mass_kg", sa.Float(), nullable=True),
        sa.Column("fat_mass_kg", sa.Float(), nullable=True),
        sa.Column("waist_height_ratio", sa.Float(), nullable=True),
        sa.Column("chest_waist_ratio", sa.Float(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_measurements_user_date", "measurements", ["user_id", "date"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_measurements_user_date", table_name="measurements")
    op.drop_table("measurements")
    op.drop_index("ix_daily_logs_user_date", table_name="daily_logs")
    op.drop_table("daily_logs")
