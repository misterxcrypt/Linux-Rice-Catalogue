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

# Allow frontend hosted on Render or GitHub Pages
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can restrict this to your frontend URL in prod
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(public.router, prefix="/api/public")

# ─── Serve Frontend ─────────────────────────────────────
frontend_path = os.path.join(os.path.dirname(__file__), "../../frontend/dist")

if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")

    @app.get("/", include_in_schema=False)
    async def serve_index():
        return FileResponse(os.path.join(frontend_path, "index.html"))
else:
    @app.get("/", include_in_schema=False)
    def root():
        return {"message": "Frontend not found. API working fine."}
