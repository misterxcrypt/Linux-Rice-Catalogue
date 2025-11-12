#!/usr/bin/env python3
"""
Migrate existing MongoDB documents to use 2D images array format.
Converts 1D arrays of filenames to 2D arrays with fileId as null.
"""

import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def migrate_images():
    # Connect to MongoDB
    mongo_url = os.getenv('MONGODB_URI')
    if not mongo_url:
        print("❌ MONGO_URL not found in environment variables")
        return

    client = MongoClient(mongo_url)
    db = client['linux-ricing-db']  # Adjust database name if different
    collection = db['rice']  # Adjust collection name if different

    print("🔄 Starting migration...")

    # Find documents where images is an array
    query = {"images": {"$exists": True, "$type": "array"}}
    documents = list(collection.find(query))

    updated_count = 0

    for doc in documents:
        images = doc['images']

        # Check if it's a 1D array of strings (old format)
        if images and isinstance(images[0], str):
            # Convert to 2D array with null fileId
            new_images = [[filename, None] for filename in images]

            # Update the document
            collection.update_one(
                {"_id": doc["_id"]},
                {"$set": {"images": new_images}}
            )

            updated_count += 1
            print(f"✅ Updated document {doc['_id']}: {images} -> {new_images}")

    print(f"🎉 Migration complete! Updated {updated_count} documents.")

    client.close()

if __name__ == "__main__":
    migrate_images()