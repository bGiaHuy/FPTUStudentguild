import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from config.settings import get_settings

async def test():
    settings = get_settings()
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT name, room_code, center_x, center_y FROM rooms LIMIT 20"))
        print(res.all())

asyncio.run(test())
