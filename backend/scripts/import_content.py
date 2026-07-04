import asyncio
import os
import sys
import csv
import json

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text, select, delete
from database.connection import engine, async_session_factory
from database.models import Base, ChatbotKnowledge, FAQ, Article, RoomMetadata

try:
    print("Khởi tạo mô hình Embedding (fastembed)...")
    from fastembed import TextEmbedding
    
    embedder = TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")
except ImportError:
    print("Error: fastembed not installed.")
    sys.exit(1)

def get_embedding(text_content):
    if not text_content:
        return [0.0]*384
    return next(embedder.embed([text_content])).tolist()

async def setup_db():
    async with engine.begin() as conn:
        print("Enabling pgvector extension...")
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        print("Creating tables...")
        await conn.run_sync(Base.metadata.create_all)

async def import_chatbot_knowledge(session, filepath):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
        
    print(f"Importing {filepath}...")
    await session.execute(delete(ChatbotKnowledge))
    
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            intent = row.get("intent", "").strip()
            q_examples = row.get("question_examples", "").strip()
            ans = row.get("approved_answer", "").strip()
            
            # Combine intent and examples for semantic search
            search_text = f"{intent}. {q_examples.replace('|', '. ')}"
            emb = get_embedding(search_text)
            
            kb = ChatbotKnowledge(
                intent=intent,
                question_examples=q_examples,
                approved_answer=ans,
                source_name=row.get("source_name", ""),
                source_url=row.get("source_url", ""),
                verified_by=row.get("verified_by", ""),
                verified_at=row.get("verified_at", ""),
                review_status=row.get("review_status", "verified"),
                published=True, # force publish for mockdata
                related_actions=row.get("related_actions", ""),
                notes=row.get("notes", ""),
                embedding=emb
            )
            session.add(kb)
    await session.commit()
    print("Chatbot Knowledge imported.")

async def import_faqs(session, filepath):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
        
    print(f"Importing {filepath}...")
    await session.execute(delete(FAQ))
    
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            q = row.get("question", "").strip()
            ans = row.get("answer", "").strip()
            
            search_text = f"{q} {ans}"
            emb = get_embedding(search_text)
            
            faq = FAQ(
                question=q,
                answer=ans,
                category=row.get("category", ""),
                source_name=row.get("source_name", ""),
                source_url=row.get("source_url", ""),
                verified_by=row.get("verified_by", ""),
                verified_at=row.get("verified_at", ""),
                review_status=row.get("review_status", "verified"),
                published=True,
                embedding=emb
            )
            session.add(faq)
    await session.commit()
    print("FAQs imported.")

async def import_articles_and_guides(session, csv_path, json_path):
    print("Importing Articles and Guides...")
    await session.execute(delete(Article))
    
    # 1. Articles CSV
    if os.path.exists(csv_path):
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                title = row.get("title", "").strip()
                content = row.get("content_md", "").strip()  # Fixed: CSV column is content_md
                
                search_text = f"{title}. {content}"
                emb = get_embedding(search_text)
                
                article = Article(
                    title=title,
                    content=content,
                    category=row.get("category", ""),
                    source_name=row.get("source_name", ""),
                    source_url=row.get("source_url", ""),
                    verified_by=row.get("verified_by", ""),
                    verified_at=row.get("verified_at", ""),
                    review_status=row.get("review_status", "verified"),
                    published=True,
                    embedding=emb
                )
                session.add(article)
                
    # 2. Website Guides JSON
    if os.path.exists(json_path):
        with open(json_path, 'r', encoding='utf-8') as f:
            guides = json.load(f)
            for row in guides:
                # Build full title with website/group context
                website = row.get("website", "").strip()
                group = row.get("group", "").strip()
                raw_title = row.get("title", "").strip()
                title = f"[{website}] {group} - {raw_title}" if website else raw_title
                
                content = row.get("instructions", "").strip()  # Fixed: JSON field is instructions
                
                search_text = f"{title}. {content}"
                emb = get_embedding(search_text)
                
                article = Article(
                    title=title,
                    content=content,
                    category="website_guide",
                    source_name=row.get("source_name", website),
                    source_url=row.get("source_url", ""),
                    verified_by=row.get("verified_by", ""),
                    verified_at=row.get("verified_at", ""),
                    review_status=row.get("review_status", "verified"),
                    published=True,
                    embedding=emb
                )
                session.add(article)
                
    # 3. Hoc Vu JSON (academic regulations)
    hoc_vu_path = os.path.join(os.path.dirname(csv_path), "hoc_vu.json")
    if os.path.exists(hoc_vu_path):
        with open(hoc_vu_path, 'r', encoding='utf-8') as f:
            hoc_vu_items = json.load(f)
            for item in hoc_vu_items:
                title = item.get("title", "").strip()
                content = item.get("content", "").strip()
                
                search_text = f"{title}. {content}"
                emb = get_embedding(search_text)
                
                article = Article(
                    title=title,
                    content=content,
                    category="hoc_vu",
                    source_name="Quy định học vụ FPTU",
                    source_url="",
                    verified_by="",
                    verified_at="",
                    review_status="verified",
                    published=True,
                    embedding=emb
                )
                session.add(article)
                
    await session.commit()
    print("Articles, Guides & Hoc Vu imported.")

async def import_room_metadata(session, filepath):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
        
    print(f"Importing {filepath}...")
    await session.execute(delete(RoomMetadata))
    
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            rm = RoomMetadata(
                room_code=row.get("room_code", ""),
                item_id=row.get("item_id", ""),
                floor=int(row.get("floor", 1)) if row.get("floor", "").isdigit() else None,
                display_name=row.get("display_name", ""),
                description=row.get("description", ""),
                tags=row.get("tags", ""),
                photos=row.get("photos", ""),
                opening_hours=row.get("opening_hours", ""),
                contact=row.get("contact", ""),
                source_name=row.get("source_name", ""),
                source_url=row.get("source_url", ""),
                verified_by=row.get("verified_by", ""),
                verified_at=row.get("verified_at", ""),
                review_status=row.get("review_status", "verified"),
                published=True
            )
            session.add(rm)
    await session.commit()
    print("Room Metadata imported.")

async def main():
    await setup_db()
    
    data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "content")
    
    async with async_session_factory() as session:
        await import_chatbot_knowledge(session, os.path.join(data_dir, "chatbot_knowledge.todo.csv"))
        await import_faqs(session, os.path.join(data_dir, "faq.todo.csv"))
        await import_articles_and_guides(
            session, 
            os.path.join(data_dir, "articles.todo.csv"), 
            os.path.join(data_dir, "website_guides.todo.json")
        )
        await import_room_metadata(session, os.path.join(data_dir, "room_metadata.todo.csv"))
        
    print("Done importing all mock data.")
    await engine.dispose()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
