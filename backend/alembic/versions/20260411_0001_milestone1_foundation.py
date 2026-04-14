"""Create milestone 1 foundation tables."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260411_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("username", name="uq_users_username"),
    )

    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash", name="uq_auth_sessions_token_hash"),
    )
    op.create_index("ix_auth_sessions_expires_at", "auth_sessions", ["expires_at"], unique=False)

    op.create_table(
        "profiles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("age", sa.Integer(), nullable=False),
        sa.Column("sex", sa.String(length=20), nullable=False),
        sa.Column("height_cm", sa.Float(), nullable=False),
        sa.Column("start_weight_kg", sa.Float(), nullable=False),
        sa.Column("current_goal_weight_kg", sa.Float(), nullable=False),
        sa.Column("estimated_body_fat_start", sa.Float(), nullable=False),
        sa.Column("adjusted_body_fat_current", sa.Float(), nullable=True),
        sa.Column("default_step_target", sa.Integer(), nullable=False),
        sa.Column("default_training_days_per_week", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_profiles_user_id"),
    )

    op.create_table(
        "phases",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("calorie_training", sa.Integer(), nullable=True),
        sa.Column("calorie_rest", sa.Integer(), nullable=True),
        sa.Column("protein_target_min", sa.Integer(), nullable=True),
        sa.Column("protein_target_max", sa.Integer(), nullable=True),
        sa.Column("fat_target", sa.Integer(), nullable=True),
        sa.Column("carb_target_training", sa.Integer(), nullable=True),
        sa.Column("carb_target_rest", sa.Integer(), nullable=True),
        sa.Column("target_weight_min", sa.Float(), nullable=True),
        sa.Column("target_weight_max", sa.Float(), nullable=True),
        sa.Column("target_body_fat_min", sa.Float(), nullable=True),
        sa.Column("target_body_fat_max", sa.Float(), nullable=True),
        sa.Column("target_weekly_loss_min", sa.Float(), nullable=True),
        sa.Column("target_weekly_loss_max", sa.Float(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_phases_user_active", "phases", ["user_id", "is_active"], unique=False)

    op.create_table(
        "goals",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("period_type", sa.String(length=30), nullable=False),
        sa.Column("metric_name", sa.String(length=100), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("target_value", sa.Float(), nullable=True),
        sa.Column("min_value", sa.Float(), nullable=True),
        sa.Column("max_value", sa.Float(), nullable=True),
        sa.Column("unit", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_goals_user_period_end_date", "goals", ["user_id", "period_type", "end_date"], unique=False)

    op.create_table(
        "exercise_reference_prs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("exercise_name", sa.String(length=120), nullable=False),
        sa.Column("reference_weight", sa.Float(), nullable=False),
        sa.Column("reference_reps", sa.Integer(), nullable=False),
        sa.Column("estimated_1rm", sa.Float(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("exercise_reference_prs")
    op.drop_index("ix_goals_user_period_end_date", table_name="goals")
    op.drop_table("goals")
    op.drop_index("ix_phases_user_active", table_name="phases")
    op.drop_table("phases")
    op.drop_table("profiles")
    op.drop_index("ix_auth_sessions_expires_at", table_name="auth_sessions")
    op.drop_table("auth_sessions")
    op.drop_table("users")

