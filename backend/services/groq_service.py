import json
import re
import asyncio
from groq import AsyncGroq
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from config.settings import get_settings
from schemas.chat_schemas import ChatMessage, ChatResponse
from database.models import ChatbotKnowledge, FAQ, Article, RoomMetadata

settings = get_settings()

# Initialize Groq async client
client = AsyncGroq(api_key=settings.GROQ_API_KEY)

# Load embedder once
embedder = None
try:
    from sentence_transformers import SentenceTransformer
    embedder = SentenceTransformer('all-MiniLM-L6-v2')
except ImportError:
    pass

def get_embedding(query: str):
    if not embedder:
        return [0.0]*384
    return embedder.encode(query).tolist()

SYSTEM_PROMPT = """Bạn là trợ lý ảo của FPTU Student Guide, chuyên giúp sinh viên Đại học FPT tìm phòng học, giải đáp thắc mắc về thi cử và thông tin hành chính.
Bạn giao tiếp thân thiện, ngắn gọn và chính xác. 

Nhiệm vụ đặc biệt: Nếu người dùng hỏi vị trí của một hoặc nhiều phòng (ví dụ: "Phòng DE-201 ở đâu?", "Chỉ đường đến lab 101 tòa Delta"), bạn PHẢI trích xuất MÃ PHÒNG (ví dụ: "DE-201", "AL-101") và trả về trong một mảng JSON. 
Nếu không tìm thấy mã phòng cụ thể, mảng này để trống.

Dưới đây là một số thông tin tham khảo (Context) có thể giúp bạn trả lời:
<CONTEXT>
{context}
</CONTEXT>

BẠN PHẢI TRẢ VỀ DỮ LIỆU DƯỚI DẠNG JSON với định dạng sau:
{
  "answer": "Câu trả lời của bạn gửi cho sinh viên (Sử dụng Context nếu có để trả lời chính xác)",
  "room_codes": ["MÃ_PHÒNG_1", "MÃ_PHÒNG_2"],
  "related_actions": ["show_map_floor_1"] 
}
Lưu ý: 
- Mã phòng thường có dạng 2 chữ cái in hoa kèm 3 số (VD: DE-201, AL-304), hoặc các format đặc trưng của FPTU. 
- Chỉ trả về `related_actions` nếu trong Context có hành động tương ứng. 
- Đảm bảo output LÀ JSON HỢP LỆ. Không output thêm bất kỳ text nào ngoài JSON block.
"""

async def search_knowledge(query: str, db: AsyncSession):
    if not embedder:
        return "", []
    
    emb = await asyncio.to_thread(get_embedding, query)
    emb_str = f"[{','.join(map(str, emb))}]"
    
    # Search ChatbotKnowledge
    stmt_kb = text(f"SELECT intent, approved_answer, related_actions FROM chatbot_knowledge ORDER BY embedding <=> '{emb_str}'::vector LIMIT 2")
    res_kb = await db.execute(stmt_kb)
    kbs = res_kb.all()
    
    # Search FAQs
    stmt_faq = text(f"SELECT question, answer FROM faqs ORDER BY embedding <=> '{emb_str}'::vector LIMIT 2")
    res_faq = await db.execute(stmt_faq)
    faqs = res_faq.all()
    
    # Search Articles
    stmt_art = text(f"SELECT title, content FROM articles ORDER BY embedding <=> '{emb_str}'::vector LIMIT 2")
    res_art = await db.execute(stmt_art)
    arts = res_art.all()
    
    context = ""
    related_actions = []
    
    if kbs:
        context += "--- Chatbot Knowledge ---\n"
        for kb in kbs:
            context += f"Intent: {kb.intent}\nAnswer: {kb.approved_answer}\n"
            if kb.related_actions:
                related_actions.append(kb.related_actions)
                
    if faqs:
        context += "--- FAQs ---\n"
        for faq in faqs:
            context += f"Q: {faq.question}\nA: {faq.answer}\n"
            
    if arts:
        context += "--- Articles / Guides ---\n"
        for art in arts:
            context += f"Title: {art.title}\nContent: {art.content[:500]}...\n"
            
    return context, related_actions

async def generate_chat_response(messages: list[ChatMessage], db: AsyncSession) -> ChatResponse:
    last_msg = messages[-1].content if messages else ""
    try:
        context, actions = await search_knowledge(last_msg, db)
    except Exception as e:
        return ChatResponse(answer=f"Debug Error: {str(e)}", room_codes=[], related_actions=[])
    
    sys_prompt = SYSTEM_PROMPT.replace("{context}", context)
    
    groq_messages = [{"role": "system", "content": sys_prompt}]
    
    for msg in messages:
        content = msg.content[:settings.CHAT_MAX_INPUT_LENGTH]
        groq_messages.append({"role": msg.role, "content": content})

    try:
        response = await client.chat.completions.create(
            messages=groq_messages,
            model=settings.GROQ_MODEL,
            response_format={"type": "json_object"},
            temperature=0.2, 
        )
        
        content = response.choices[0].message.content
        data = json.loads(content)
        
        return ChatResponse(
            answer=data.get("answer", "Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này."),
            room_codes=data.get("room_codes", []),
            related_actions=data.get("related_actions", [])
        )
        
    except Exception as e:
        print(f"Groq API Error: {e}")
        return ChatResponse(
            answer="Hệ thống đang gặp sự cố kết nối với AI. Vui lòng thử lại sau.",
            room_codes=[],
            related_actions=[]
        )
