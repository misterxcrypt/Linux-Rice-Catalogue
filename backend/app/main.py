from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import public, admin

app = FastAPI(title="Linux Rice Catalogue API")

# CORS, routers, etc.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(public.router, prefix="/api/public")

# ─── add this ────────────────────────────────────────────────────────────────
@app.get("/", include_in_schema=False)
def root():
    return {"message": "Welcome to Linux Rice Catalogue API"}
# ───────────────────────────────────────────────────────────────────────────────

