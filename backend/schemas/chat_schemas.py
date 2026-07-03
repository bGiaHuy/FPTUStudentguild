from pydantic import BaseModel, Field
from typing import List, Optional

class ChatMessage(BaseModel):
    role: str = Field(..., description="Role of the sender: 'user' or 'assistant'")
    content: str = Field(..., description="Content of the message")

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    user_id: str = Field(..., description="Supabase Auth user ID")

class ChatResponse(BaseModel):
    answer: str = Field(..., description="The AI's response text")
    room_codes: List[str] = Field(default_factory=list, description="Extracted room codes to highlight on the map")
    related_actions: List[str] = Field(default_factory=list, description="Action codes (e.g. show_map_floor_1)")

