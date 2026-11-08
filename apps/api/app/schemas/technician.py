from uuid import UUID

from pydantic import BaseModel


class TechnicianResponse(BaseModel):
    id: UUID
    full_name: str
    email: str


class TechnicianListResponse(BaseModel):
    items: list[TechnicianResponse]
