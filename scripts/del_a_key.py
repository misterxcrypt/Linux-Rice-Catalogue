from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))
# MongoDB Connection
MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB")
COLLECTION_NAME = "rice"

# 🚀 Connect to MongoDB
client = MongoClient(MONGO_URI)
collection = client[DB_NAME][COLLECTION_NAME]

# 🔨 Remove the 'screenshots_data' field from all documents
result = collection.update_many(
    {"screenshots_data": {"$exists": True}},  # Only docs that have this field
    {"$unset": {"screenshots_data": ""}}      # Unset = remove the field
)

print(f"🗑️ Removed 'screenshots_data' from {result.modified_count} documents.")
