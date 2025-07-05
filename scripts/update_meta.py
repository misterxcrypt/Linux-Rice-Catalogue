import os
import json
from pymongo import MongoClient
from dotenv import load_dotenv

# --- Load Env ---
load_dotenv()
MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB")
COLLECTION_NAME = "rice"

# --- Connect to MongoDB ---
client = MongoClient(MONGO_URI)
collection = client[DB_NAME][COLLECTION_NAME]

# --- Load JSON File ---
INPUT_JSON = "../data/rice_metadata_from_url_and_readme.json"

with open(INPUT_JSON, "r", encoding="utf-8") as f:
    data = json.load(f)

# --- Update Loop ---
updated = 0
not_found = 0
skipped = 0

for entry in data:
    source_key = entry.get("source_key")
    distro = entry.get("distro")
    theme = entry.get("theme")

    if not source_key:
        skipped += 1
        continue

    update_fields = {}
    if distro:
        update_fields["distro"] = distro
    if theme:
        update_fields["theme"] = theme

    if not update_fields:
        skipped += 1
        continue

    result = collection.update_one(
        {"source_key": source_key},
        {"$set": update_fields}
    )

    if result.matched_count:
        print(f"✅ Updated: {source_key} → {update_fields}")
        updated += 1
    else:
        print(f"⚠️  Not found: {source_key}")
        not_found += 1

# --- Summary ---
print("\n🎯 Update Complete")
print(f"✅ Updated: {updated}")
print(f"⏭️ Skipped (no changes): {skipped}")
print(f"❌ Not found in DB: {not_found}")
