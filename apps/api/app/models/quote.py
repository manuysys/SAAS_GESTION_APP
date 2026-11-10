from __future__ import annotations

import secrets
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TenantMixin, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.work_order import WorkOrder


def generate_public_token() -> str:
    return secrets.token_urlsafe(32)


class Quote(UUIDMixin, TenantMixin, TimestampMixin, Base):
    __tablename__ = "quotes"
    __table_args__ = (UniqueConstraint("tenant_id", "number", name="uq_quotes_tenant_number"),)

    customer_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("customers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    work_order_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("work_orders.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    number: Mapped[str] = mapped_column(String(24), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False, index=True)
    currency: Mapped[str] = mapped_column(String(3), default="ARS", nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), default=Decimal("0.00"), nullable=False
    )
    discount_total: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), default=Decimal("0.00"), nullable=False
    )
    tax_total: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), default=Decimal("0.00"), nullable=False
    )
    total: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    valid_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    public_token: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, default=generate_public_token, nullable=False
    )

    work_order: Mapped["WorkOrder | None"] = relationship(back_populates="quotes")  # noqa: UP037
    items: Mapped[list[QuoteItem]] = relationship(
        back_populates="quote",
        cascade="all, delete-orphan",
        order_by="QuoteItem.sort_order",
    )
    events: Mapped[list[QuoteEvent]] = relationship(
        back_populates="quote",
        cascade="all, delete-orphan",
    )


class QuoteItem(UUIDMixin, TenantMixin, Base):
    __tablename__ = "quote_items"

    quote_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("quotes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    description: Mapped[str] = mapped_column(String(300), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    discount_rate: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=Decimal("0.00"), nullable=False
    )
    tax_rate: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=Decimal("0.00"), nullable=False
    )
    line_total: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    quote: Mapped[Quote] = relationship(back_populates="items")


class QuoteEvent(UUIDMixin, Base):
    __tablename__ = "quote_events"

    tenant_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    quote_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("quotes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_type: Mapped[str] = mapped_column(String(40), nullable=False)
    actor_user_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    payload: Mapped[dict[str, object] | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    quote: Mapped[Quote] = relationship(back_populates="events")
