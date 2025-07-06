from pymongo import MongoClient
from urllib.parse import urlparse
import re
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB")
COLLECTION_NAME = "rice"

client = MongoClient(MONGO_URI)
collection = client[DB_NAME][COLLECTION_NAME]

# --- Helper functions ---

def get_github_key(url: str) -> str | None:
    match = re.search(r'github\.com/([\w.-]+/[\w.-]+)(/tree/[\w./-]+)?', url, re.IGNORECASE)
    if match:
        base = match.group(1).lower()
        tree = match.group(2) or ''
        return f"github:{base}{tree}"
    return None

def get_reddit_key(url: str) -> str | None:
    match = re.search(r'/comments/([a-z0-9]+)', url, re.IGNORECASE)
    return f"reddit:{match.group(1)}" if match else None

def get_source_key(doc: dict) -> str | None:
    if doc.get("reddit_post"):
        key = get_reddit_key(doc["reddit_post"])
        if key: return key
    if doc.get("dotfiles"):
        key = get_github_key(doc["dotfiles"])
        if key: return key
    return None

# --- Start processing ---

updated = 0
skipped = 0
deleted = 0

for doc in collection.find({}):
    correct_key = get_source_key(doc)

    if not correct_key:
        skipped += 1
        continue

    if doc.get("source_key") == correct_key:
        continue  # Already correct

    # Check if correct_key already exists in another doc
    existing = collection.find_one({
        "source_key": correct_key,
        "_id": { "$ne": doc["_id"] }
    })

    if existing:
        # Conflict! This doc is outdated or duplicate. Delete it.
        collection.delete_one({ "_id": doc["_id"] })
        print(f"🗑️ Deleted duplicate doc {doc['_id']} due to existing key: {correct_key}")
        deleted += 1
    else:
        # Safe to update
        collection.update_one(
            { "_id": doc["_id"] },
            { "$set": { "source_key": correct_key } }
        )
        print(f"✅ Updated {doc['_id']} → {correct_key}")
        updated += 1

# --- Summary ---
print(f"\n✅ Updated: {updated}")
print(f"🗑️ Deleted (due to conflict): {deleted}")
print(f"⏭️ Skipped (no key): {skipped}")
