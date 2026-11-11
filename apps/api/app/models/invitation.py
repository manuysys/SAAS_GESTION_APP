from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class Invitation(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "invitations"
    __table_args__ = (
        Index(
            "ix_invitations_tenant_email_pending",
            "tenant_id",
            "email_normalized",
            unique=True,
            postgresql_where="accepted_at IS NULL AND revoked_at IS NULL",
        ),
    )

    tenant_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    email_normalized: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    invited_by: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
