from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class TeamMemberResponse(BaseModel):
    id: UUID
    user_id: UUID
    full_name: str
    email: str
    role: str
    status: str
    last_login_at: datetime | None = None


class TeamInvitationResponse(BaseModel):
    id: UUID
    email: str
    role: str
    status: str
    expires_at: datetime
    created_at: datetime


class TeamListResponse(BaseModel):
    members: list[TeamMemberResponse]
    invitations: list[TeamInvitationResponse]


class InvitationCreateRequest(BaseModel):
    email: EmailStr
    role: str = Field(pattern="^(admin|dispatcher|technician|viewer)$")
    full_name: str | None = Field(default=None, max_length=160)


class InvitationCreateResponse(TeamInvitationResponse):
    invitation_url: str
    email_status: str


class PublicInvitationResponse(BaseModel):
    tenant_name: str
    email_masked: str
    role: str
    expires_at: datetime
    status: str


class InvitationAcceptRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=160)
    password: str | None = Field(default=None, min_length=8, max_length=128)

    model_config = {"extra": "ignore"}
