from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_client_ip, require_roles
from app.core.db import get_db
from app.models import Membership
from app.schemas.quote import (
    QuoteCreate,
    QuoteEventResponse,
    QuoteListResponse,
    QuoteResponse,
    QuoteSummaryResponse,
    QuoteUpdate,
)
from app.services import audit_service, quote_service

router = APIRouter(prefix="/quotes", tags=["quotes"])

READ_ROLES = ("owner", "admin", "dispatcher")
WRITE_ROLES = ("owner", "admin", "dispatcher")


@router.get("", response_model=QuoteListResponse)
async def list_quotes(
    status_filter: str | None = Query(default=None, alias="status"),
    customer_id: UUID | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    membership: Membership = Depends(require_roles(*READ_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> QuoteListResponse:
    items, total = await quote_service.list_tenant_quotes(
        db,
        tenant_id=membership.tenant_id,
        status_filter=status_filter,
        customer_id=customer_id,
        limit=limit,
        offset=offset,
    )
    return QuoteListResponse(
        items=[QuoteSummaryResponse.model_validate(item) for item in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=QuoteResponse, status_code=status.HTTP_201_CREATED)
async def create_quote(
    payload: QuoteCreate,
    membership: Membership = Depends(require_roles(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> QuoteResponse:
    quote = await quote_service.create_tenant_quote(
        db,
        tenant_id=membership.tenant_id,
        payload=payload,
        actor_user_id=membership.user_id,
    )
    return QuoteResponse.model_validate(quote)


@router.get("/{quote_id}", response_model=QuoteResponse)
async def get_quote(
    quote_id: UUID,
    membership: Membership = Depends(require_roles(*READ_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> QuoteResponse:
    quote = await quote_service.get_tenant_quote(
        db, tenant_id=membership.tenant_id, quote_id=quote_id
    )
    return QuoteResponse.model_validate(quote)


@router.patch("/{quote_id}", response_model=QuoteResponse)
async def update_quote(
    quote_id: UUID,
    payload: QuoteUpdate,
    membership: Membership = Depends(require_roles(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> QuoteResponse:
    quote = await quote_service.update_tenant_quote(
        db,
        tenant_id=membership.tenant_id,
        quote_id=quote_id,
        payload=payload,
        actor_user_id=membership.user_id,
    )
    return QuoteResponse.model_validate(quote)


async def _audit_quote_action(
    db: AsyncSession,
    request: Request,
    membership: Membership,
    quote: QuoteResponse,
    action: str,
) -> None:
    await audit_service.record(
        db,
        action=action,
        entity_type="quote",
        entity_id=str(quote.id),
        tenant_id=membership.tenant_id,
        actor_user_id=membership.user_id,
        metadata={"number": quote.number},
        ip=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    await db.commit()


@router.post("/{quote_id}/send", response_model=QuoteResponse)
async def send_quote(
    quote_id: UUID,
    request: Request,
    membership: Membership = Depends(require_roles(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> QuoteResponse:
    quote = await quote_service.send_quote(
        db,
        tenant_id=membership.tenant_id,
        quote_id=quote_id,
        actor_user_id=membership.user_id,
    )
    await _audit_quote_action(
        db, request, membership, QuoteResponse.model_validate(quote), "quote_sent"
    )
    return QuoteResponse.model_validate(quote)


@router.post("/{quote_id}/approve", response_model=QuoteResponse)
async def approve_quote(
    quote_id: UUID,
    request: Request,
    membership: Membership = Depends(require_roles(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> QuoteResponse:
    quote = await quote_service.approve_quote(
        db,
        tenant_id=membership.tenant_id,
        quote_id=quote_id,
        actor_user_id=membership.user_id,
    )
    await _audit_quote_action(
        db, request, membership, QuoteResponse.model_validate(quote), "quote_approved"
    )
    return QuoteResponse.model_validate(quote)


@router.post("/{quote_id}/reject", response_model=QuoteResponse)
async def reject_quote(
    quote_id: UUID,
    request: Request,
    membership: Membership = Depends(require_roles(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> QuoteResponse:
    quote = await quote_service.reject_quote(
        db,
        tenant_id=membership.tenant_id,
        quote_id=quote_id,
        actor_user_id=membership.user_id,
    )
    await _audit_quote_action(
        db, request, membership, QuoteResponse.model_validate(quote), "quote_rejected"
    )
    return QuoteResponse.model_validate(quote)


@router.post("/{quote_id}/revoke-public-link", response_model=QuoteResponse)
async def revoke_public_link(
    quote_id: UUID,
    request: Request,
    membership: Membership = Depends(require_roles(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> QuoteResponse:
    quote = await quote_service.revoke_public_link(
        db,
        tenant_id=membership.tenant_id,
        quote_id=quote_id,
        actor_user_id=membership.user_id,
    )
    await _audit_quote_action(
        db, request, membership, QuoteResponse.model_validate(quote), "quote_public_link_revoked"
    )
    return QuoteResponse.model_validate(quote)


@router.get("/{quote_id}/pdf")
async def get_quote_pdf(
    quote_id: UUID,
    membership: Membership = Depends(require_roles(*READ_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> Response:
    pdf_bytes = await quote_service.generate_quote_pdf(
        db, tenant_id=membership.tenant_id, quote_id=quote_id
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="quote-{quote_id}.pdf"'},
    )


@router.get("/{quote_id}/events", response_model=list[QuoteEventResponse])
async def list_quote_events(
    quote_id: UUID,
    membership: Membership = Depends(require_roles(*READ_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> list[QuoteEventResponse]:
    events = await quote_service.list_tenant_quote_events(
        db, tenant_id=membership.tenant_id, quote_id=quote_id
    )
    return [QuoteEventResponse.model_validate(event) for event in events]
