from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.schemas.quote import PublicQuoteDecision, PublicQuoteResponse
from app.services import quote_service

router = APIRouter(prefix="/public/quotes", tags=["public-quotes"])


@router.get("/{token}", response_model=PublicQuoteResponse)
async def get_public_quote(
    token: str,
    db: AsyncSession = Depends(get_db),
) -> PublicQuoteResponse:
    return await quote_service.public_get_quote(db, token=token)


@router.post("/{token}/approve", response_model=PublicQuoteResponse)
async def approve_public_quote(
    token: str,
    decision: PublicQuoteDecision,
    db: AsyncSession = Depends(get_db),
) -> PublicQuoteResponse:
    return await quote_service.public_approve_quote(db, token=token, decision=decision)


@router.post("/{token}/reject", response_model=PublicQuoteResponse)
async def reject_public_quote(
    token: str,
    decision: PublicQuoteDecision,
    db: AsyncSession = Depends(get_db),
) -> PublicQuoteResponse:
    return await quote_service.public_reject_quote(db, token=token, decision=decision)
