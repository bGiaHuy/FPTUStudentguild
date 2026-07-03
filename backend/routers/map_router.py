from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from database.connection import get_db
from database.models import Campus, Building, Floor, Node, Edge, Room, RoomMetadata
from schemas.map_schemas import (
    CampusResponse, BuildingResponse, FloorResponse, 
    FullGraphResponse, NodeResponse, EdgeResponse, RoomResponse, RoomMetadataResponse
)

router = APIRouter(prefix="/api/map", tags=["Map"])

@router.get("/campuses", response_model=List[CampusResponse])
async def get_campuses(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Campus))
    return result.scalars().all()

@router.get("/buildings/{building_id}/floors", response_model=List[FloorResponse])
async def get_floors(building_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Floor).where(Floor.building_id == building_id).order_by(Floor.floor_number))
    return result.scalars().all()

@router.get("/floors/{floor_id}/map-items", response_model=List[RoomResponse])
async def get_map_items(floor_id: int, db: AsyncSession = Depends(get_db)):
    """
    Returns all map items (rooms, doors, facilities) for a floor.
    Excludes topology/edges.
    """
    result = await db.execute(
        select(Room)
        .where(Room.floor_id == floor_id)
        .order_by(Room.item_type, Room.name)
    )
    return result.scalars().all()

@router.get("/buildings/{building_id}/full-graph", response_model=FullGraphResponse)
async def get_full_graph(building_id: int, db: AsyncSession = Depends(get_db)):
    """
    Returns the complete graph (all nodes and edges across all floors)
    for a given building. This is passed to the Web Worker for A* routing.
    """
    # 1. Get all floors for the building
    floors_result = await db.execute(select(Floor.id).where(Floor.building_id == building_id))
    floor_ids = [row[0] for row in floors_result.all()]
    
    if not floor_ids:
        raise HTTPException(status_code=404, detail="No floors found for this building")

    # 2. Get all nodes
    nodes_result = await db.execute(select(Node).where(Node.floor_id.in_(floor_ids)))
    nodes = nodes_result.scalars().all()

    # 3. Get all edges
    edges_result = await db.execute(
        select(Edge).where(
            (Edge.floor_id.in_(floor_ids)) | (Edge.floor_id.is_(None)) # Include cross-floor edges
        )
    )
    edges = edges_result.scalars().all()

    # 4. Get all rooms
    rooms_result = await db.execute(select(Room).where(Room.floor_id.in_(floor_ids)))
    rooms = rooms_result.scalars().all()

    return FullGraphResponse(
        nodes=[NodeResponse.model_validate(n) for n in nodes],
        edges=[EdgeResponse.model_validate(e) for e in edges],
        rooms=[RoomResponse.model_validate(r) for r in rooms],
    )

@router.get("/metadata/{room_code}", response_model=RoomMetadataResponse)
async def get_room_metadata(room_code: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(RoomMetadata).where(RoomMetadata.room_code == room_code))
    metadata = result.scalars().first()
    if not metadata:
        raise HTTPException(status_code=404, detail="Room metadata not found")
    return metadata

