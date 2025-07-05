from pymongo import MongoClient
from urllib.parse import urlparse
import re
from dotenv import load_dotenv
import os

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))
# MongoDB Connection
MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB")
COLLECTION_NAME = "rice"

client = MongoClient(MONGO_URI)
collection = client[DB_NAME][COLLECTION_NAME]

# --- Helper Functions ---

def get_reddit_key(reddit_url: str) -> str | None:
    match = re.search(r'/comments/([a-z0-9]+)', reddit_url, re.IGNORECASE)
    return f"reddit:{match.group(1)}" if match else None

def get_github_key(url: str) -> str | None:
    match = re.search(r'github\.com/([\w.-]+/[\w.-]+)(/tree/[\w./-]+)?', url, re.IGNORECASE)
    if match:
        base = match.group(1).lower()            # e.g., AlphaTechnolog/dotfiles
        tree = match.group(2) or ''               # e.g., /tree/openbox
        return f"github:{base}{tree}"
    return None

def get_source_key(doc: dict) -> str | None:
    reddit = doc.get("reddit_post")
    dotfiles = doc.get("dotfiles")

    if reddit:
        reddit_key = get_reddit_key(reddit)
        if reddit_key:
            return reddit_key

    if dotfiles:
        github_key = get_github_key(dotfiles)
        if github_key:
            return github_key

    return None

# --- Update Documents ---

updated = 0
skipped = 0

for doc in collection.find({}):
    source_key = get_source_key(doc)

    if not source_key:
        skipped += 1
        continue

    if doc.get("source_key") == source_key:
        continue  # Already updated

    result = collection.update_one(
        {"_id": doc["_id"]},
        {"$set": {"source_key": source_key}}
    )

    if result.modified_count:
        updated += 1

print(f"✅ Updated documents: {updated}")
print(f"⏭️ Skipped (no key): {skipped}")
