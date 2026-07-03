import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from database.models import ChatRequest
from config.settings import get_settings

settings = get_settings()

async def check_rate_limit(user_id: str, db: AsyncSession) -> bool:
    """
    Check if the user has exceeded their daily chat limit.
    Returns True if allowed, False if limit exceeded.
    """
    today = datetime.datetime.utcnow().date()
    start_of_day = datetime.datetime(today.year, today.month, today.day)
    
    # Count requests for this user today
    result = await db.execute(
        select(func.count(ChatRequest.id))
        .where(ChatRequest.user_id == user_id)
        .where(ChatRequest.created_at >= start_of_day)
    )
    count = result.scalar_one_or_none() or 0
    
    return count < settings.CHAT_RATE_LIMIT

async def record_chat_request(user_id: str, message_length: int, db: AsyncSession):
    """
    Record a successful chat request for rate limiting purposes.
    """
    new_req = ChatRequest(user_id=user_id, message_length=message_length)
    db.add(new_req)
    await db.commit()
