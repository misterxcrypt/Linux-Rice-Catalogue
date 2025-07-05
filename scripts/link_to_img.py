import os
import requests
from pymongo import MongoClient
from bson.binary import Binary
from dotenv import load_dotenv

# Load .env variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB")

# Connect to MongoDB
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db["rice"]  # ⬅️ Replace with actual collection name

# Loop through each document
for doc in collection.find():
    screenshots = doc.get("screenshots", [])
    screenshots_data = []

    for url in screenshots:
        try:
            response = requests.get(url)
            response.raise_for_status()
            img_binary = Binary(response.content)
            screenshots_data.append(img_binary)
        except Exception as e:
            print(f"Failed to download {url}: {e}")
            screenshots_data.append(None)

    # Update the document with binary images
    collection.update_one(
        {"_id": doc["_id"]},
        {"$set": {"screenshots_data": screenshots_data}}
    )

print("✅ Images downloaded and stored in MongoDB.")
