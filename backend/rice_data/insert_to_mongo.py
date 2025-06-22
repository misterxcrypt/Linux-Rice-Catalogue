import json
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

# --- Configuration ---
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = "linux-ricing-db"
COLLECTION_NAME = "rice"
JSON_PATH = "../../data/formatted_rices.json"

# --- Connect to MongoDB ---
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db[COLLECTION_NAME]

# --- Load and Insert JSON ---
with open(JSON_PATH, "r", encoding="utf-8") as f:
    rice_data = json.load(f)

inserted_count = 0
skipped_count = 0

for rice in rice_data:
    query = {}

    # if rice.get("reddit_post") and rice["reddit_post"] != "NULL":
    #     query = {"reddit_post": rice["reddit_post"]}
    # elif rice.get("dotfiles"):
    #     query = {"dotfiles": rice["dotfiles"]}
    # else:
    #     continue  # Skip entries with neither

    # Check if already exists
    if collection.count_documents(query) == 0:
        collection.insert_one(rice)
        inserted_count += 1
    else:
        skipped_count += 1

print(f"✅ Inserted: {inserted_count}")
print(f"⏭️ Skipped (duplicates): {skipped_count}")
