from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email.lower()))
    return result.scalar_one_or_none()


async def create_user(
    db: AsyncSession,
    *,
    email: str,
    password_hash: str,
    full_name: str,
) -> User:
    user = User(
        email=email.lower(),
        password_hash=password_hash,
        full_name=full_name,
    )
    db.add(user)
    await db.flush()
    return user
