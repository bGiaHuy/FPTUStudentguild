from pydantic import BaseModel
from typing import List, Optional, Any

# ─── Floor ───────────────────────────────────────────────
class FloorBase(BaseModel):
    floor_number: int
    name: str
    map_image_url: Optional[str] = None
    bounds: Optional[List[List[float]]] = None

class FloorResponse(FloorBase):
    id: int
    building_id: int

    class Config:
        from_attributes = True

# ─── Building ────────────────────────────────────────────
class BuildingBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None

class BuildingResponse(BuildingBase):
    id: int
    campus_id: int
    floors: List[FloorResponse] = []

    class Config:
        from_attributes = True

# ─── Campus ──────────────────────────────────────────────
class CampusBase(BaseModel):
    name: str
    code: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class CampusResponse(CampusBase):
    id: int
    buildings: List[BuildingResponse] = []

    class Config:
        from_attributes = True

# ─── Node & Edge (Graph) ────────────────────────────────
class NodeResponse(BaseModel):
    node_id: str
    x: float
    y: float
    type: str
    linked_room_code: Optional[str] = None
    floor_id: int

    class Config:
        from_attributes = True

class EdgeResponse(BaseModel):
    from_node_id: str
    to_node_id: str
    weight: float
    edge_type: str

    class Config:
        from_attributes = True

class RoomResponse(BaseModel):
    item_id: Optional[str] = None
    room_code: str
    name: str
    item_type: str
    description: Optional[str] = None
    photos: List[str] = []
    center_x: float
    center_y: float
    polygon: List[List[float]] = []
    
    aliases: List[str] = []
    searchable: bool = True
    highlightable: bool = True
    needs_human_confirmation: bool = False
    extra_data: dict = {}

    class Config:
        from_attributes = True

class FullGraphResponse(BaseModel):
    """Returned to the client Web Worker for A* routing."""
    nodes: List[NodeResponse]
    edges: List[EdgeResponse]
    rooms: List[RoomResponse]

class RoomMetadataResponse(BaseModel):
    room_code: str
    display_name: Optional[str] = None
    description: Optional[str] = None
    opening_hours: Optional[str] = None
    contact: Optional[str] = None
    photos: Optional[str] = None

    class Config:
        from_attributes = True

