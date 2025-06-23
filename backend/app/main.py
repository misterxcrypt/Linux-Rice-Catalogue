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

# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse
import os

from app.routes import public, admin

app = FastAPI(title="Linux Rice Catalogue API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins = [
    "https://linux-rice-catalogue.onrender.com",
    "http://localhost:3000",
],  # In prod, restrict to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(public.router, prefix="/api/public")

# Serve built frontend (Vite dist/)
frontend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend/dist"))

if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="static")

    @app.get("/", include_in_schema=False)
    async def serve_index():
        return FileResponse(os.path.join(frontend_path, "index.html"))
else:
    @app.get("/", include_in_schema=False)
    def fallback_root():
        return {"message": "Frontend not found."}
