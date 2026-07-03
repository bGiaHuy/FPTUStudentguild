from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from database.connection import get_db
from schemas.chat_schemas import ChatRequest, ChatResponse
from services.groq_service import generate_chat_response
from services.rate_limiter import check_rate_limit, record_chat_request
from config.settings import get_settings

router = APIRouter(prefix="/api/chat", tags=["Chatbot"])
settings = get_settings()

@router.post("", response_model=ChatResponse)
async def chat_with_bot(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    """
    Endpoint for communicating with the AI chatbot.
    Includes rate limiting per user.
    """
    user_id = request.user_id
    
    # 1. Rate limit disabled per MVP requirement
    # is_allowed = await check_rate_limit(user_id, db)
    # if not is_allowed:
    #     raise HTTPException(...)

    try:
        if not request.messages:
            raise HTTPException(status_code=400, detail="Messages array cannot be empty")
            
        latest_msg = request.messages[-1]
        msg_length = len(latest_msg.content)

        response = await generate_chat_response(request.messages, db)

        await record_chat_request(user_id, msg_length, db)

        return response
    except Exception as e:
        import traceback
        err_str = traceback.format_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}\n{err_str}")

    return response
