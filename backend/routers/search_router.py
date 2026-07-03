from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_
from typing import List

from database.connection import get_db
from database.models import Room
from schemas.map_schemas import RoomResponse

router = APIRouter(prefix="/api/search", tags=["Search"])

@router.get("", response_model=List[RoomResponse])
async def search_rooms(q: str, limit: int = 10, db: AsyncSession = Depends(get_db)):
    """
    Search for rooms by room_code or name.
    """
    if not q or len(q.strip()) == 0:
        return []
        
    search_term = f"%{q.strip().lower()}%"
    
    result = await db.execute(
        select(Room)
        .where(
            or_(
                Room.room_code.ilike(search_term),
                Room.name.ilike(search_term)
            )
        )
        .limit(limit)
    )
    
    rooms = result.scalars().all()
    return rooms
