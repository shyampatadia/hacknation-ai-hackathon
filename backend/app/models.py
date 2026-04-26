from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class CrisisQueryRequest(BaseModel):
    query: str = Field(min_length=3)
    language: str = "auto"
    user_location: str | None = None


class FacilityRecord(BaseModel):
    id: str
    name: str
    type: str
    city: str
    state: str
    distance_km: int
    trust_score: int
    specialties: list[str]
    evidence: str
    flags: list[str]


class DistrictRecord(BaseModel):
    name: str
    summary: str
    desert_score: int
    status: str


class CrisisQueryResponse(BaseModel):
    query: str
    language: str
    facilities: list[FacilityRecord]
    desert_alert: dict[str, Any]


class AgentQueryRequest(BaseModel):
    payload: str = Field(min_length=1)


class AgentQueryResponse(BaseModel):
    agent_response: str

class AuthenticatedUser(BaseModel):
    id: str
    email: EmailStr
    role: str = "authenticated"
    last_sign_in_at: str | None = None


class UserProfileUpsert(BaseModel):
    role: str
    full_name: str | None = None
    organization: str | None = None
    district: str | None = None
    state: str | None = None
    language: str | None = None


class UserProfile(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    email: EmailStr
    role: str
    full_name: str | None = None
    organization: str | None = None
    district: str | None = None
    state: str | None = None
    language: str | None = None
    created_at: str | None = None
    updated_at: str | None = None
