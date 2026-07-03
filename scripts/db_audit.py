import sys
import os
import asyncio
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend"))

from database.connection import async_session_factory, engine
from database.models import Campus, Building, Floor, Room
from sqlalchemy import select, func

async def audit():
    async with async_session_factory() as session:
        print("=== 1. Campuses ===")
        campuses = await session.execute(select(Campus))
        for c in campuses.scalars():
            print(f"ID: {c.id} | Name: {c.name} | Code: {c.code}")
        print()

        print("=== 2. Buildings ===")
        buildings = await session.execute(select(Building))
        for b in buildings.scalars():
            c = await session.get(Campus, b.campus_id)
            print(f"ID: {b.id} | Name: {b.name} | Code: {b.code} | Campus ID: {b.campus_id} | Campus: {c.name} ({c.code})")
        print()

        print("=== 3 & 4. Floors & Counts ===")
        delta_buildings = await session.execute(select(Building).where(Building.code == "DELTA"))
        for b in delta_buildings.scalars():
            c = await session.get(Campus, b.campus_id)
            print(f"Building: {b.name} ({b.code}) on Campus {c.name} ({c.code})")
            floors = await session.execute(select(Floor).where(Floor.building_id == b.id).order_by(Floor.floor_number))
            for f in floors.scalars():
                count = await session.scalar(select(func.count(Room.id)).where(Room.floor_id == f.id))
                print(f"  Floor {f.id}: {f.name} (Level {f.floor_number}) -> {count} items")
            print()
        
        print("=== 5. Sample Rows ===")
        samples_query = await session.execute(select(Room).where(
            Room.room_code.in_(["icpdp", "startup", "cửa", "219", "219A", "440"]) | 
            Room.item_id.like("%107B%")
        ))
        for r in samples_query.scalars():
            f = await session.get(Floor, r.floor_id)
            print(f"--- Sample on {f.name} ---")
            print(f"room_code: {r.room_code} | name: {r.name}")
            print(f"item_id: {r.item_id}")
            print(f"item_type: {r.item_type}")
            print(f"searchable: {r.searchable} | highlightable: {r.highlightable} | needs_human_confirmation: {r.needs_human_confirmation}")
            print(f"polygon: {r.polygon}")
            print(f"extra_data: {r.extra_data}")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(audit())
