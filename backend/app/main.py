# from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware
# from app.routes import public, admin

# app = FastAPI(title="Linux Rice Catalogue API")

# # CORS, routers, etc.
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:3000"],
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
# app.include_router(public.router, prefix="/api/public")

# # ─── add this ────────────────────────────────────────────────────────────────
# @app.get("/", include_in_schema=False)
# def root():
#     return {"message": "Welcome to Linux Rice Catalogue API"}
# # ───────────────────────────────────────────────────────────────────────────────

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse
import os

from app.routes import public, admin

app = FastAPI(title="Linux Rice Catalogue API")

# CORS configuration (adjust origins in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # e.g., ["https://your-frontend.onrender.com"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include your API routes
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(public.router, prefix="/api/public")

# ───── Serve Frontend (from frontend/dist) ─────
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend/dist"))

if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="static")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        index_file = os.path.join(frontend_dist, "index.html")
        return FileResponse(index_file)
else:
    @app.get("/", include_in_schema=False)
    def root():
        return {"message": "API is live, but frontend not found."}