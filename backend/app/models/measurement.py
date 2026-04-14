from __future__ import annotations

from datetime import date

from sqlalchemy import Date, Float, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class Measurement(TimestampMixin, Base):
    __tablename__ = "measurements"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    neck_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    waist_navel_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    waist_narrow_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    chest_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    hips_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    glutes_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    arm_relaxed_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    arm_flexed_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    thigh_mid_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    thigh_upper_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    calf_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    navy_body_fat_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    adjusted_body_fat_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    lean_mass_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    fat_mass_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    waist_height_ratio: Mapped[float | None] = mapped_column(Float, nullable=True)
    chest_waist_ratio: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

