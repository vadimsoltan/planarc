from __future__ import annotations

from datetime import date

from sqlalchemy import Boolean, Date, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class Phase(TimestampMixin, Base):
    __tablename__ = "phases"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    calorie_training: Mapped[int | None] = mapped_column(Integer, nullable=True)
    calorie_rest: Mapped[int | None] = mapped_column(Integer, nullable=True)
    protein_target_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    protein_target_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fat_target: Mapped[int | None] = mapped_column(Integer, nullable=True)
    carb_target_training: Mapped[int | None] = mapped_column(Integer, nullable=True)
    carb_target_rest: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_weight_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    target_weight_max: Mapped[float | None] = mapped_column(Float, nullable=True)
    target_body_fat_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    target_body_fat_max: Mapped[float | None] = mapped_column(Float, nullable=True)
    target_weekly_loss_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    target_weekly_loss_max: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user = relationship("User", back_populates="phases")

