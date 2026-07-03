import json
import asyncio
import os
import sys
import argparse
import ssl

# Add parent directory to sys.path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from backend.database.models import Campus, Building, Floor, Room
from sqlalchemy import select

async def audit_supabase(session_factory):
    async with session_factory() as session:
        print("\n--- Post-Seed Audit ---")
        campus_result = await session.execute(select(Campus).where(Campus.code == "HN"))
        campus = campus_result.scalars().first()
        print(f"Campus: {campus.name if campus else 'NOT FOUND'} / HN")
        
        building_result = await session.execute(select(Building).where(Building.code == "DELTA"))
        buildings = building_result.scalars().all()
        if len(buildings) > 1:
            print(f"WARNING: Found duplicate DELTA buildings! Count: {len(buildings)}")
        elif len(buildings) == 1:
            print(f"Building: {buildings[0].name} / DELTA")
        else:
            print(f"Building: NOT FOUND")
            return
            
        building = buildings[0]
        floors_res = await session.execute(select(Floor).where(Floor.building_id == building.id))
        floors = floors_res.scalars().all()
        floor_ids = [f.id for f in floors]
        
        rooms_res = await session.execute(select(Room).where(Room.floor_id.in_(floor_ids)))
        rooms = rooms_res.scalars().all()
        
        floor_counts = {}
        for r in rooms:
            fname = next((f.name for f in floors if f.id == r.floor_id), "Unknown")
            floor_counts[fname] = floor_counts.get(fname, 0) + 1
            
        print("Floor counts:")
        for fname in ["Tầng 1", "Tầng 2", "Tầng 3", "Tầng 4"]:
            print(f"  {fname}: {floor_counts.get(fname, 0)}")
            
        samples = ["icpdp", "startup", "219A", "cửa 107B", "440"]
        print("Sample items found:")
        for s in samples:
            found = next((r for r in rooms if s.lower() in (r.name or "").lower() or s.lower() in (r.room_code or "").lower() or any(s.lower() in a.lower() for a in (r.aliases or []))), None)
            print(f"  {s}: {'YES' if found else 'NO'}")
            
        # Check duplicates
        item_ids = [r.item_id for r in rooms if r.item_id]
        if len(item_ids) != len(set(item_ids)):
            print("WARNING: Duplicate item_ids found among Delta rooms!")
        else:
            print("Confirm no duplicate item_id among Delta rooms: YES")

async def seed_delta_from_json(session_factory, data, prune_stale=False):
    async with session_factory() as session:
        # 1. Ensure Campus
        campus_result = await session.execute(select(Campus).where(Campus.code == "HN"))
        campus = campus_result.scalars().first()
        if not campus:
            campus = Campus(name="FPT University Hanoi", code="HN", latitude=21.0125, longitude=105.5271)
            session.add(campus)
            await session.flush()

        # 2. Ensure Building
        building_result = await session.execute(select(Building).where(Building.code == "DELTA", Building.campus_id == campus.id))
        buildings = building_result.scalars().all()
        if len(buildings) > 1:
            print("ABORT: Multiple DELTA buildings found. Aborting to prevent corruption.")
            return
        building = buildings[0] if buildings else None
        if not building:
            building = Building(campus_id=campus.id, name=data.get("building", {}).get("name", "Delta"), code="DELTA")
            session.add(building)
            await session.flush()

        # 3. Ensure Floors & Gather their IDs
        floors_dict = {}
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
            
        delta_floors_res = await session.execute(select(Floor.id).where(Floor.building_id == building.id))
        delta_f_ids = [f for f in delta_floors_res.scalars()]

        # 4. Gather Existing Rooms
        if not delta_f_ids:
            existing_rooms_by_item_id = {}
            existing_rooms = []
        else:
            existing_rooms_res = await session.execute(select(Room).where(Room.floor_id.in_(delta_f_ids)))
            existing_rooms = existing_rooms_res.scalars().all()
            existing_rooms_by_item_id = {r.item_id: r for r in existing_rooms if r.item_id}

        # 5. Upsert JSON Items
        items_seeded = 0
        floors_seeded = set()
        seen_item_ids = set()
        
        for floor_data in data.get("floors", []):
            fname = floor_data.get("floor_name")
            floor_id = floors_dict.get(fname)
            if not floor_id: continue
            
            floors_seeded.add(fname)
            
            for item in floor_data.get("items", []):
                item_id = item.get("item_id")
                if not item_id:
                    continue
                seen_item_ids.add(item_id)
                
                bbox = item.get("bbox")
                polygon = []
                if bbox:
                    polygon = [
                        [bbox["x1"], bbox["y1"]],
                        [bbox["x2"], bbox["y1"]],
                        [bbox["x2"], bbox["y2"]],
                        [bbox["x1"], bbox["y2"]]
                    ]
                
                extra_data = {
                    "source_sheet": item.get("source_sheet"),
                    "source_cell": item.get("source_cell"),
                    "source_range": item.get("source_range"),
                    "coordinate_source": item.get("coordinate_source"),
                    "note": item.get("note"),
                    "original_bbox": bbox,
                    "original_label": item.get("label"),
                    "original_display_code": item.get("display_code"),
                    "linked_room_code": item.get("linked_room_code")
                }
                
                extra_data = {k: v for k, v in extra_data.items() if v is not None}
                
                if item_id in existing_rooms_by_item_id:
                    # Update
                    room = existing_rooms_by_item_id[item_id]
                    room.floor_id = floor_id
                    room.room_code = item.get("room_code", "UNKNOWN")
                    room.name = item.get("display_code", "")
                    room.item_type = item.get("type", "unknown")
                    room.center_x = item.get("center_x", 0.0)
                    room.center_y = item.get("center_y", 0.0)
                    room.polygon = polygon
                    room.aliases = item.get("aliases", [])
                    room.searchable = item.get("searchable", False)
                    room.highlightable = item.get("highlightable", False)
                    room.needs_human_confirmation = item.get("needs_human_confirmation", False)
                    room.extra_data = extra_data
                else:
                    # Insert
                    room = Room(
                        item_id=item_id,
                        floor_id=floor_id,
                        room_code=item.get("room_code", "UNKNOWN"),
                        name=item.get("display_code", ""),
                        item_type=item.get("type", "unknown"),
                        center_x=item.get("center_x", 0.0),
                        center_y=item.get("center_y", 0.0),
                        polygon=polygon,
                        aliases=item.get("aliases", []),
                        searchable=item.get("searchable", False),
                        highlightable=item.get("highlightable", False),
                        needs_human_confirmation=item.get("needs_human_confirmation", False),
                        extra_data=extra_data
                    )
                    session.add(room)
                items_seeded += 1

        # Prune stale
        if prune_stale:
            stale_rooms = [r for r in existing_rooms if r.item_id and r.item_id not in seen_item_ids]
            if stale_rooms:
                for r in stale_rooms:
                    await session.delete(r)
                print(f"Pruned {len(stale_rooms)} stale rooms from DELTA floors.")

        await session.commit()
        print(f"Database seeding completed: Upserted {items_seeded} items across {len(floors_seeded)} floors.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed Delta map data to a remote Supabase Postgres database.")
    parser.add_argument("--dry-run", action="store_true", help="Print expected actions but do not write.")
    parser.add_argument("--confirm", action="store_true", help="Confirm execution to write to database.")
    parser.add_argument("--prune-stale", action="store_true", help="Delete Delta map items that are no longer in JSON.")
    args = parser.parse_args()

    json_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "delta_floors.json")
    if not os.path.exists(json_path):
        print(f"Could not find {json_path}")
        sys.exit(1)

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Dry-run logic
    if args.dry_run:
        print("--- DRY RUN MODE ---")
        db_url = os.getenv("SUPABASE_DATABASE_URL", "NOT_SET")
        safe_db_url = db_url
        if "@" in db_url and ":" in db_url:
            try:
                auth_part, host_part = db_url.split("@")
                user_part = auth_part.rsplit(":", 1)[0]
                safe_db_url = f"{user_part}:***@{host_part}"
            except Exception:
                safe_db_url = "postgresql+asyncpg://***:***@***"
        
        print(f"Target DB Host: {safe_db_url}")
        
        total_items = 0
        floor_counts = {}
        for floor in data.get("floors", []):
            count = len(floor.get("items", []))
            floor_counts[floor.get("floor_name")] = count
            total_items += count
            
        print(f"Expected total item count: {total_items}")
        print("Expected floor counts:")
        for fname, count in floor_counts.items():
            print(f"  {fname}: {count}")
            
        print("Zero database writes will be performed.")
        sys.exit(0)

    if not args.confirm:
        print("ERROR: Safety check failed.")
        print("Please run this script with --dry-run or --confirm flag.")
        sys.exit(1)

    db_url = os.getenv("SUPABASE_DATABASE_URL")
    if not db_url:
        print("ERROR: SUPABASE_DATABASE_URL environment variable is not set.")
        sys.exit(1)

    # Normalize Supabase DSN for asyncpg
    if "sslmode=require" in db_url:
        db_url = db_url.replace("?sslmode=require", "").replace("&sslmode=require", "")
        
    safe_db_url = db_url
    if "@" in db_url and ":" in db_url:
        try:
            auth_part, host_part = db_url.split("@")
            user_part = auth_part.rsplit(":", 1)[0]
            safe_db_url = f"{user_part}:***@{host_part}"
        except Exception:
            safe_db_url = "postgresql+asyncpg://***:***@***"
            
    print(f"Connecting to database: {safe_db_url}")

    async def main():
        # Setup SSL context for asyncpg to safely connect to Supabase
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        engine = create_async_engine(
            db_url, 
            echo=False,
            connect_args={"ssl": ssl_context}
        )
        session_factory = async_sessionmaker(bind=engine, expire_on_commit=False)
        
        try:
            await seed_delta_from_json(session_factory, data, prune_stale=args.prune_stale)
            await audit_supabase(session_factory)
        finally:
            await engine.dispose()
    
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
    asyncio.run(main())
