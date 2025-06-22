# backend/app/routes/admin.py
from fastapi import APIRouter, Header
from app.db import get_rice_collection
from app.crud import get_pending_rices
from datetime import datetime
from bson import ObjectId
from collections import Counter
from pydantic import BaseModel
from dotenv import load_dotenv
import os

load_dotenv()
router = APIRouter()

ADMIN_TOKEN = os.getenv("ADMIN_TOKEN")
ADMIN_SECRET = os.getenv("ADMIN_SECRET")

def verify_admin_token(authorization: str = Header(...)):
    if authorization != f"Bearer {ADMIN_TOKEN}":
        raise HTTPException(status_code=401, detail="Unauthorized")

@router.get("/submissions")
def get_pending_submissions():
    collection = get_rice_collection()
    rices = list(collection.find({"status": "pending"}))
    for r in rices:
        r["id"] = str(r["_id"])
        del r["_id"]
    return rices

@router.get("/stats")
def get_stats():
    collection = get_rice_collection()
    all_rices = list(collection.find({}))

    now = datetime.utcnow()

    def is_same_day(dt1, dt2):
        return dt1.date() == dt2.date()

    def is_same_month(dt1, dt2):
        return dt1.year == dt2.year and dt1.month == dt2.month

    def is_same_year(dt1, dt2):
        return dt1.year == dt2.year

    def extract_date(obj):
        return obj.get("created_at", obj.get("_id").generation_time)

    total = len(all_rices)
    today = sum(1 for r in all_rices if is_same_day(now, extract_date(r)))
    this_month = sum(1 for r in all_rices if is_same_month(now, extract_date(r)))
    this_year = sum(1 for r in all_rices if is_same_year(now, extract_date(r)))

    env_counter = Counter([r["environment"]["name"] for r in all_rices if "environment" in r])

    return {
        "total": total,
        "today": today,
        "month": this_month,
        "year": this_year,
        "environment_distribution": env_counter
    }

@router.post("/approve/{rice_id}")
def approve_rice(rice_id: str):
    collection = get_rice_collection()
    collection.update_one({"_id": ObjectId(rice_id)}, {"$set": {"status": "approved"}})
    return {"message": "Approved"}

@router.post("/reject/{rice_id}")
def reject_rice(rice_id: str):
    collection = get_rice_collection()
    collection.update_one({"_id": ObjectId(rice_id)}, {"$set": {"status": "rejected"}})
    return {"message": "Rejected"}

class LoginRequest(BaseModel):
    password: str

@router.post("/login")
def login_admin(req: LoginRequest):
    if req.password == ADMIN_SECRET:
        return {"token": ADMIN_SECRET}
    raise HTTPException(status_code=401, detail="Invalid password")
