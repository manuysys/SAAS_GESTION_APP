from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import ORMModel


class TenantCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=160)
    company_name: str = Field(min_length=2, max_length=160)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"  # noqa: S105
    expires_in: int


class UserResponse(ORMModel):
    id: UUID
    email: EmailStr
    full_name: str
    status: str
    is_platform_admin: bool = False


class TenantResponse(ORMModel):
    id: UUID
    name: str
    slug: str
    role: str | None = None


class AuthResponse(TokenResponse):
    tenants: list[TenantResponse]


class MobileLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class MobileAuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"  # noqa: S105
    expires_in: int
    tenants: list[TenantResponse]


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(min_length=1)


class MeResponse(BaseModel):
    user: UserResponse
    tenants: list[TenantResponse]
