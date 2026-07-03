import json
import asyncio
import os
import sys

# Add parent directory to sys.path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

from database.connection import async_session_factory, engine
from database.models import Base, Campus, Building, Floor, Room, Node, Edge
from sqlalchemy import select, delete

async def init_db():
    async with engine.begin() as conn:
        # Create all tables (skipping drop_all to avoid PostGIS conflicts)
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables recreated.")

async def seed_delta_from_json():
    json_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "frontend", "public", "data", "delta_draft.json")
    
    if not os.path.exists(json_path):
        print(f"Could not find {json_path}")
        return

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    async with async_session_factory() as session:
        # 1. Ensure Campus
        campus_result = await session.execute(select(Campus).where(Campus.code == "HN"))
        campus = campus_result.scalars().first()
        if not campus:
            campus = Campus(name="FPT University Hanoi", code="HN", latitude=21.0125, longitude=105.5271)
            session.add(campus)
            await session.flush()

        # 2. Ensure Building
        building_result = await session.execute(select(Building).where(Building.code == "DELTA", Building.campus_id == campus.id))
        building = building_result.scalars().first()
        if not building:
            building = Building(campus_id=campus.id, name=data.get("building", {}).get("name", "Delta"), code="DELTA")
            session.add(building)
            await session.flush()

        # 3. Ensure Floors & Gather their IDs
        floors_dict = {} # normalized_floor_name -> floor_id
        for floor_data in data.get("floors", []):
            fname = floor_data.get("floor_name")
            fnum = floor_data.get("floor_number", 0)
            
            floor_result = await session.execute(select(Floor).where(Floor.building_id == building.id, Floor.name == fname))
            floor = floor_result.scalars().first()
            if not floor:
                floor = Floor(building_id=building.id, floor_number=fnum, name=fname)
                session.add(floor)
                await session.flush()
                print(f"Created floor: {fname}")
                
            floors_dict[fname] = floor.id
            
        # 4. Idempotency: Delete only existing Room rows for DELTA floors (across any campus to handle the HCM -> HN switch)
        delta_buildings_res = await session.execute(select(Building.id).where(Building.code == "DELTA"))
        delta_b_ids = [b for b in delta_buildings_res.scalars()]
        if delta_b_ids:
            delta_floors_res = await session.execute(select(Floor.id).where(Floor.building_id.in_(delta_b_ids)))
            delta_f_ids = [f for f in delta_floors_res.scalars()]
            if delta_f_ids:
                await session.execute(delete(Room).where(Room.floor_id.in_(delta_f_ids)))
                await session.flush()
                print("Cleared existing DELTA rooms for idempotency.")

        # 5. Insert JSON Items
        items_seeded = 0
        floors_seeded = set()
        
        for floor_data in data.get("floors", []):
            fname = floor_data.get("floor_name")
            floor_id = floors_dict.get(fname)
            if not floor_id: continue
            
            floors_seeded.add(fname)
            
            for item in floor_data.get("items", []):
                # Convert bbox to polygon
                bbox = item.get("bbox")
                polygon = []
                center_x = 0.0
                center_y = 0.0
                if bbox and "min_x" in bbox:
                    polygon = [
                        [bbox["min_x"], bbox["min_y"]],
                        [bbox["max_x"], bbox["min_y"]],
                        [bbox["max_x"], bbox["max_y"]],
                        [bbox["min_x"], bbox["max_y"]]
                    ]
                    center_x = (bbox["min_x"] + bbox["max_x"]) / 2.0
                    center_y = (bbox["min_y"] + bbox["max_y"]) / 2.0
                elif bbox and "x1" in bbox: # fallback for old format
                    polygon = [
                        [bbox["x1"], bbox["y1"]],
                        [bbox["x2"], bbox["y1"]],
                        [bbox["x2"], bbox["y2"]],
                        [bbox["x1"], bbox["y2"]]
                    ]
                    center_x = (bbox["x1"] + bbox["x2"]) / 2.0
                    center_y = (bbox["y1"] + bbox["y2"]) / 2.0
                
                # Extract extra_data
                extra_data = {
                    "source_sheet": item.get("source_sheet"),
                    "source_cell": item.get("source_cell"),
                    "source_range": item.get("source_range"),
                    "coordinate_source": item.get("coordinate_source"),
                    "note": item.get("note"),
                    "original_bbox": bbox,
                    "original_label": item.get("label"),
                    "original_display_name": item.get("display_name"),
                    "linked_room_code": item.get("linked_room_code")
                }
                
                # Remove None values from extra_data to save space
                extra_data = {k: v for k, v in extra_data.items() if v is not None}
                
                room = Room(
                    item_id=item.get("item_id"),
                    floor_id=floor_id,
                    room_code=item.get("room_code", "UNKNOWN"),
                    name=item.get("display_name", ""),
                    item_type=item.get("type", "unknown"),
                    center_x=item.get("center_x", center_x),
                    center_y=item.get("center_y", center_y),
                    polygon=polygon,
                    aliases=item.get("aliases", []),
                    searchable=item.get("searchable", False),
                    highlightable=item.get("highlightable", False),
                    needs_human_confirmation=item.get("needs_human_confirmation", False),
                    extra_data=extra_data
                )
                session.add(room)
                items_seeded += 1
                
        await session.commit()
        print(f"Database seeding completed: Seeded {items_seeded} items across {len(floors_seeded)} floors.")


if __name__ == "__main__":
    async def main():
        if "--reset-db" in sys.argv:
            print("Running full database reset (--reset-db flag provided)...")
            await init_db()
        else:
            print("Skipping full database reset. Use --reset-db to drop and recreate all tables.")
            
        await seed_delta_from_json()
        await engine.dispose() # Properly close the connection pool
    
    # Use WindowsSelectorEventLoopPolicy if needed on Windows
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
    asyncio.run(main())
