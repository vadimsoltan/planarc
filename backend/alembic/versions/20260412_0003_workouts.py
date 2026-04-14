"""Add milestone 4 workout tables."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260412_0003"
down_revision = "20260411_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "workouts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("workout_type", sa.String(length=32), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_workouts_user_date", "workouts", ["user_id", "date"], unique=False)

    op.create_table(
        "workout_exercises",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("workout_id", sa.Integer(), nullable=False),
        sa.Column("exercise_name", sa.String(length=120), nullable=False),
        sa.Column("exercise_order", sa.Integer(), nullable=False),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["workout_id"], ["workouts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("workout_id", "exercise_order", name="uq_workout_exercises_workout_order"),
    )
    op.create_index("ix_workout_exercises_workout_order", "workout_exercises", ["workout_id", "exercise_order"], unique=False)
    op.create_index("ix_workout_exercises_name", "workout_exercises", ["exercise_name"], unique=False)

    op.create_table(
        "workout_sets",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("workout_exercise_id", sa.Integer(), nullable=False),
        sa.Column("set_number", sa.Integer(), nullable=False),
        sa.Column("weight", sa.Float(), nullable=False),
        sa.Column("reps", sa.Integer(), nullable=False),
        sa.Column("rir", sa.Float(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["workout_exercise_id"], ["workout_exercises.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("workout_exercise_id", "set_number", name="uq_workout_sets_exercise_set_number"),
    )
    op.create_index("ix_workout_sets_exercise_set_number", "workout_sets", ["workout_exercise_id", "set_number"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_workout_sets_exercise_set_number", table_name="workout_sets")
    op.drop_table("workout_sets")
    op.drop_index("ix_workout_exercises_name", table_name="workout_exercises")
    op.drop_index("ix_workout_exercises_workout_order", table_name="workout_exercises")
    op.drop_table("workout_exercises")
    op.drop_index("ix_workouts_user_date", table_name="workouts")
    op.drop_table("workouts")
