from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.security import hash_password
from app.models.exercise_reference_pr import ExerciseReferencePR
from app.models.goal import Goal
from app.models.phase import Phase
from app.models.profile import Profile
from app.models.user import User
from app.repositories.user_repository import count_users


@dataclass(frozen=True)
class ReferencePRSeed:
    exercise_name: str
    reference_weight: float
    reference_reps: int
    notes: str | None = None

    @property
    def estimated_1rm(self) -> float:
        return round(self.reference_weight * (1 + self.reference_reps / 30), 2)


REFERENCE_PRS: tuple[ReferencePRSeed, ...] = (
    ReferencePRSeed("Incline Smith Bench", 225, 4),
    ReferencePRSeed("Tricep Pushdown", 120, 12),
    ReferencePRSeed("DB Shoulder Press", 55, 8),
    ReferencePRSeed("Cable Lateral Raise", 30, 10, "Per arm"),
    ReferencePRSeed("Leg Press", 455, 8, "Sled 185 lb + 3 plates each side"),
    ReferencePRSeed("Smith Deadlift", 225, 8),
    ReferencePRSeed("Ham Curl", 100, 10, "Per leg"),
    ReferencePRSeed("Leg Extension", 100, 10, "Per leg"),
    ReferencePRSeed("Lat Pulldown", 160, 8),
    ReferencePRSeed("Seated Row", 140, 8),
    ReferencePRSeed("Face Pull", 110, 15),
    ReferencePRSeed("Bayesian Curl", 50, 10, "Per arm"),
    ReferencePRSeed("Ab Machine", 135, 15),
)


def bootstrap_if_needed(db: Session, settings: Settings) -> bool:
    if count_users(db) > 0:
        return False

    today = date.today()
    phase_one_end = today + timedelta(weeks=12)
    phase_two_start = phase_one_end + timedelta(days=1)
    phase_two_end = phase_two_start + timedelta(weeks=12)
    phase_three_start = phase_two_end + timedelta(days=1)

    user = User(username=settings.admin_username, password_hash=hash_password(settings.admin_password))
    db.add(user)
    db.flush()

    db.add(
        Profile(
            user_id=user.id,
            age=29,
            sex="male",
            height_cm=195,
            start_weight_kg=95,
            current_goal_weight_kg=87,
            estimated_body_fat_start=22,
            adjusted_body_fat_current=22,
            default_step_target=8000,
            default_training_days_per_week=5,
        )
    )

    db.add_all(
        [
            Phase(
                user_id=user.id,
                name="Aggressive Recomp",
                description="Phase 1 focused on aggressive body recomposition and strength regain.",
                start_date=today,
                end_date=phase_one_end,
                calorie_training=2200,
                calorie_rest=2000,
                protein_target_min=200,
                protein_target_max=210,
                fat_target=60,
                target_weight_min=87,
                target_weight_max=88,
                target_weekly_loss_min=0.5,
                target_weekly_loss_max=0.9,
                is_active=True,
            ),
            Phase(
                user_id=user.id,
                name="Maintenance/Recomp",
                description="Phase 2 focused on maintenance calories, recomp, and strength regain.",
                start_date=phase_two_start,
                end_date=phase_two_end,
                calorie_training=2700,
                calorie_rest=2500,
                protein_target_min=190,
                protein_target_max=210,
                fat_target=70,
                target_weight_min=87,
                target_weight_max=89,
                is_active=False,
            ),
            Phase(
                user_id=user.id,
                name="Lean Gain/Refinement",
                description="Phase 3 focused on improving fullness with waist control.",
                start_date=phase_three_start,
                end_date=None,
                calorie_training=2800,
                calorie_rest=2600,
                protein_target_min=190,
                protein_target_max=205,
                fat_target=75,
                target_body_fat_min=12,
                target_body_fat_max=15,
                is_active=False,
            ),
        ]
    )

    db.add_all(
        [
            Goal(
                user_id=user.id,
                period_type="biweekly",
                metric_name="Average weight loss",
                start_date=today,
                end_date=today + timedelta(days=14),
                min_value=0.35,
                unit="kg/week",
                status="on_track",
            ),
            Goal(
                user_id=user.id,
                period_type="biweekly",
                metric_name="Protein average",
                start_date=today,
                end_date=today + timedelta(days=14),
                min_value=200,
                unit="g/day",
                status="on_track",
            ),
            Goal(
                user_id=user.id,
                period_type="biweekly",
                metric_name="Steps average",
                start_date=today,
                end_date=today + timedelta(days=14),
                min_value=8000,
                unit="steps/day",
                status="on_track",
            ),
            Goal(
                user_id=user.id,
                period_type="monthly",
                metric_name="Waist change",
                start_date=today,
                end_date=today + timedelta(days=30),
                min_value=1,
                max_value=2,
                unit="cm",
                status="on_track",
            ),
            Goal(
                user_id=user.id,
                period_type="monthly",
                metric_name="Strength recovery",
                start_date=today,
                end_date=today + timedelta(days=30),
                min_value=10,
                max_value=15,
                unit="pct",
                status="on_track",
            ),
            Goal(
                user_id=user.id,
                period_type="quarterly",
                metric_name="Phase target weight",
                start_date=today,
                end_date=today + timedelta(days=90),
                min_value=87,
                max_value=88,
                unit="kg",
                status="on_track",
            ),
        ]
    )

    db.add_all(
        [
            ExerciseReferencePR(
                user_id=user.id,
                exercise_name=seed.exercise_name,
                reference_weight=seed.reference_weight,
                reference_reps=seed.reference_reps,
                estimated_1rm=seed.estimated_1rm,
                notes=seed.notes,
            )
            for seed in REFERENCE_PRS
        ]
    )

    db.commit()
    return True

