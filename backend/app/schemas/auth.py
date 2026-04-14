from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1, max_length=128)


class UserSummary(BaseModel):
    id: int
    username: str

    model_config = ConfigDict(from_attributes=True)

