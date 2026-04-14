from __future__ import annotations

from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class Profile(TimestampMixin, Base):
    __tablename__ = "profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    sex: Mapped[str] = mapped_column(String(20), nullable=False)
    height_cm: Mapped[float] = mapped_column(Float, nullable=False)
    start_weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    current_goal_weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    estimated_body_fat_start: Mapped[float] = mapped_column(Float, nullable=False)
    adjusted_body_fat_current: Mapped[float | None] = mapped_column(Float, nullable=True)
    default_step_target: Mapped[int] = mapped_column(Integer, nullable=False)
    default_training_days_per_week: Mapped[int] = mapped_column(Integer, nullable=False)

    user = relationship("User", back_populates="profile")

