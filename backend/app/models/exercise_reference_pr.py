from __future__ import annotations

from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class ExerciseReferencePR(TimestampMixin, Base):
    __tablename__ = "exercise_reference_prs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    exercise_name: Mapped[str] = mapped_column(String(120), nullable=False)
    reference_weight: Mapped[float] = mapped_column(Float, nullable=False)
    reference_reps: Mapped[int] = mapped_column(Integer, nullable=False)
    estimated_1rm: Mapped[float] = mapped_column(Float, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    user = relationship("User", back_populates="exercise_reference_prs")

