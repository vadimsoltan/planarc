from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


WorkoutType = Literal["push", "pull", "legs", "upper", "lower", "custom"]
ExerciseCategory = Literal["compound", "isolation", "cardio", "core"]


class WorkoutSetBase(BaseModel):
    set_number: int = Field(ge=1, le=100)
    weight: float = Field(ge=0, le=2000)
    reps: int = Field(ge=0, le=1000)
    rir: float | None = Field(default=None, ge=0, le=10)
    notes: str | None = Field(default=None, max_length=4000)


class WorkoutSetCreate(WorkoutSetBase):
    pass


class WorkoutSetUpdate(WorkoutSetBase):
    pass


class WorkoutSetRead(WorkoutSetBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class WorkoutExerciseBase(BaseModel):
    exercise_name: str = Field(min_length=1, max_length=120)
    exercise_order: int = Field(ge=1, le=100)
    category: ExerciseCategory


class WorkoutExerciseCreate(WorkoutExerciseBase):
    sets: list[WorkoutSetCreate] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_unique_set_numbers(self) -> "WorkoutExerciseCreate":
        set_numbers = [item.set_number for item in self.sets]
        if len(set_numbers) != len(set(set_numbers)):
            raise ValueError("Set numbers must be unique within an exercise")
        return self


class WorkoutExerciseUpdate(WorkoutExerciseBase):
    sets: list[WorkoutSetUpdate] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_unique_set_numbers(self) -> "WorkoutExerciseUpdate":
        set_numbers = [item.set_number for item in self.sets]
        if len(set_numbers) != len(set(set_numbers)):
            raise ValueError("Set numbers must be unique within an exercise")
        return self


class WorkoutExerciseRead(WorkoutExerciseBase):
    id: int
    workout_id: int
    sets: list[WorkoutSetRead]

    model_config = ConfigDict(from_attributes=True)


class WorkoutBase(BaseModel):
    date: date
    workout_type: WorkoutType
    duration_minutes: int | None = Field(default=None, ge=0, le=1440)
    notes: str | None = Field(default=None, max_length=4000)


class WorkoutCreate(WorkoutBase):
    exercises: list[WorkoutExerciseCreate] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_unique_exercise_orders(self) -> "WorkoutCreate":
        exercise_orders = [item.exercise_order for item in self.exercises]
        if len(exercise_orders) != len(set(exercise_orders)):
            raise ValueError("Exercise order values must be unique within a workout")
        return self


class WorkoutUpdate(WorkoutBase):
    exercises: list[WorkoutExerciseUpdate] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_unique_exercise_orders(self) -> "WorkoutUpdate":
        exercise_orders = [item.exercise_order for item in self.exercises]
        if len(exercise_orders) != len(set(exercise_orders)):
            raise ValueError("Exercise order values must be unique within a workout")
        return self


class WorkoutRead(WorkoutBase):
    id: int
    user_id: int
    exercises: list[WorkoutExerciseRead]

    model_config = ConfigDict(from_attributes=True)
