import jwt
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from config.settings import get_settings

settings = get_settings()

class SupabaseAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Cho phép các request OPTIONS đi qua (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)
            
        # Áp dụng Middleware này cho các route nhạy cảm
        if request.url.path.startswith("/api/chat"):
            auth_header = request.headers.get("Authorization")
            request.state.user = None
            
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
                try:
                    unverified_header = jwt.get_unverified_header(token)
                    print(f"Token alg: {unverified_header.get('alg')}")
                    
                    decoded_token = jwt.decode(
                        token, 
                        settings.SUPABASE_JWT_SECRET, 
                        algorithms=["HS256", "HS384", "HS512", "RS256"], 
                        options={"verify_aud": False}
                    )
                    request.state.user = decoded_token
                except Exception as e:
                    print(f"Auth failed (optional): {str(e)}")
                    
        # Tiếp tục xử lý request
        response = await call_next(request)
        return response
