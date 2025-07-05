# import json
# from pymongo import MongoClient
from dotenv import load_dotenv
import os
import json
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError, PyMongoError

dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path)

# --- Configuration ---
MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = "linux-ricing-db"
COLLECTION_NAME = "rice"
JSON_PATH = "../data/formatted_rices.json"

# --- Connect to MongoDB ---
client = MongoClient(MONGO_URI)
print("🧭 Connected to:", client.address)
db = client[DB_NAME]
collection = db[COLLECTION_NAME]
# --- Load and Insert JSON ---
with open(JSON_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

# inserted_count = 0
# skipped_count = 0

# for rice in rice_data:
#     try:
#         result = collection.insert_one(rice)
#         print(f"✅ Inserted: {result.inserted_id}")
#         inserted_count += 1
#     except DuplicateKeyError:
#         print(f"⚠️ Skipped duplicate: {rice.get('source_key')}")
#         skipped_count += 1
#     except Exception as e:
#         print(f"❌ Error inserting: {e}")

#     # if rice.get("reddit_post") and rice["reddit_post"] != "NULL":
#     #     query = {"reddit_post": rice["reddit_post"]}
#     # elif rice.get("dotfiles"):
#     #     query = {"dotfiles": rice["dotfiles"]}
#     # else:
#     #     continue  # Skip entries with neither

#     # Check if already exists
#     # if collection.count_documents(query) == 0:
#     #     collection.insert_one(rice)
#     #     inserted_count += 1
#     # else:
#     #     skipped_count += 1

# print(f"✅ Inserted: {inserted_count}")
# print(f"⏭️ Skipped (duplicates): {skipped_count}")

# # --- MongoDB Connection ---
# MONGO_URI = "your-mongodb-connection-uri"
# DB_NAME = "your-db-name"
# COLLECTION_NAME = "rice"

# client = MongoClient(MONGO_URI)
# collection = client[DB_NAME][COLLECTION_NAME]

# --- Load JSON data ---
# with open("your_file.json", "r", encoding="utf-8") as f:
#     data = json.load(f)  # either a single dict or a list of dicts

# If it's a single document
if isinstance(data, dict):
    data = [data]  # wrap in list for consistent handling

inserted_count = 0
skipped_count = 0
failed_docs = []

inserted_ids = []

for i, rice in enumerate(data, 1):
    try:
        result = collection.insert_one(rice)
        inserted_id = str(result.inserted_id)
        print(f"✅ {i:03} Inserted: {inserted_id}")
        inserted_ids.append(inserted_id)
        inserted_count += 1
    except DuplicateKeyError:
        print(f"⏭️  {i:03} Skipped duplicate: {rice.get('source_key')}")
        skipped_count += 1
    except PyMongoError as e:
        print(f"❌ {i:03} Insert failed: {e}")
        failed_docs.append({**rice, "error": str(e)})

# Save to file
with open("inserted_ids.txt", "w") as f:
    for _id in inserted_ids:
        f.write(f"{_id}\n")

print(f"\n📦 Total inserted: {inserted_count}")
print(f"⏭️ Total skipped: {skipped_count}")
print(f"❌ Total failed: {len(failed_docs)}")

existing_ids = collection.distinct("_id")
existing_ids = set(str(_id) for _id in existing_ids)

with open("inserted_ids.txt", "r") as f:
    inserted_ids = [line.strip() for line in f]

missing_ids = [id_ for id_ in inserted_ids if id_ not in existing_ids]

print(f"🟢 Found: {len(inserted_ids) - len(missing_ids)}")
print(f"🔴 Missing: {len(missing_ids)}")

if missing_ids:
    print("❌ Missing IDs:")
    for m in missing_ids:
        print(f"- {m}")

