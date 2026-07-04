from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.settings import get_settings
from routers import map_router, chat_router, search_router, report_router, obstacle_router, admin_router
from middlewares.auth_middleware import SupabaseAuthMiddleware
from database.connection import engine
from database.models import Base

settings = get_settings()

app = FastAPI(
    title="FPTU Student Guide API",
    description="Backend API for FPTU Student Guide App",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add Auth Middleware
app.add_middleware(SupabaseAuthMiddleware)

# Include Routers
app.include_router(map_router.router)
app.include_router(chat_router.router)
app.include_router(search_router.router)
app.include_router(report_router.router)
app.include_router(obstacle_router.router)
app.include_router(admin_router.router)


@app.on_event("startup")
async def startup():
    """Tự động tạo bảng reports + obstacles nếu chưa có."""
    from database.models import Report, Obstacle
    from sqlalchemy import text
    async with engine.begin() as conn:
        # Create vector extension if not exists for Supabase compatibility
        try:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        except Exception as e:
            print(f"Warning: Could not create vector extension (maybe using sqlite?): {e}")
            
        await conn.run_sync(
            Base.metadata.create_all,
            tables=[Report.__table__, Obstacle.__table__]
        )


@app.get("/")
async def root():
    return {"message": "Welcome to FPTU Student Guide API", "env": settings.APP_ENV}
