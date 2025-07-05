import os
from pymongo import MongoClient
from dotenv import load_dotenv
from collections import defaultdict

# 🔐 Load environment variables
load_dotenv()
MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB")
COLLECTION_NAME = "rice"

# 🔌 Connect to MongoDB
client = MongoClient(MONGO_URI)
collection = client[DB_NAME][COLLECTION_NAME]

# 📦 Collect all documents with a source_key
print("🔍 Scanning for duplicates...")
docs = list(collection.find({"source_key": {"$exists": True}}))

# 🗃️ Group by source_key
grouped = defaultdict(list)
for doc in docs:
    grouped[doc["source_key"]].append(doc)

# 🧹 Delete duplicates (keep first one)
total_deleted = 0
for source_key, items in grouped.items():
    if len(items) > 1:
        to_delete = items[1:]  # keep first, delete rest
        for doc in to_delete:
            collection.delete_one({"_id": doc["_id"]})
            total_deleted += 1
        print(f"🗑️ Deleted {len(to_delete)} duplicate(s) for source_key: {source_key}")

print(f"\n✅ Finished! Total duplicates deleted: {total_deleted}")
