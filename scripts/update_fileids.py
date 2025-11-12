#!/usr/bin/env python3
"""
Update MongoDB documents with ImageKit fileIds.
Goes through all docs, searches ImageKit for each image filename, and updates the fileId in the images array.
"""

import os
import time
from pymongo import MongoClient
from imagekitio import ImageKit
from imagekitio.models.ListAndSearchFileRequestOptions import ListAndSearchFileRequestOptions
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB connection
mongo_url = os.getenv('MONGODB_URI')
client = MongoClient(mongo_url)
db = client['linux-ricing-db']
collection = db['rice']

# ImageKit configuration
imagekit = ImageKit(
    public_key=os.getenv('IMAGEKIT_PUBLIC_KEY'),
    private_key=os.getenv('IMAGEKIT_PRIVATE_KEY'),
    url_endpoint=os.getenv('IMAGEKIT_URL_ENDPOINT')
)

def get_file_id(filename):
    """Search ImageKit for filename and return fileId if found"""
    try:
        options = ListAndSearchFileRequestOptions(
            search_query=f'name="{filename}"'
        )
        result = imagekit.list_files(options=options)

        if result.list and len(result.list) > 0:
            return result.list[0].file_id
        else:
            print(f"⚠️ No file found for {filename}")
            return None
    except Exception as e:
        print(f"❌ Error searching for {filename}: {str(e)}")
        return None

def update_file_ids():
    print("🔄 Starting fileId update process...")

    # Find all documents with images
    documents = list(collection.find({"images": {"$exists": True, "$ne": []}}))

    updated_count = 0

    for doc in documents:
        doc_id = doc['_id']
        images = doc['images']
        needs_update = False
        new_images = []

        for image_entry in images:
            if isinstance(image_entry, list) and len(image_entry) == 2:
                filename, file_id = image_entry
                if file_id is None:
                    # Need to get fileId
                    print(f"🔍 Getting fileId for {filename} in doc {doc_id}")
                    file_id = get_file_id(filename)
                    if file_id:
                        print(f"✅ Found fileId: {file_id}")
                    else:
                        print(f"❌ FileId not found, keeping null")
                    # Add delay to avoid rate limits
                    time.sleep(0.5)
                new_images.append([filename, file_id])
                if file_id is not None:
                    needs_update = True
            else:
                # Keep as is if not in expected format
                new_images.append(image_entry)

        if needs_update:
            # Update the document
            collection.update_one(
                {"_id": doc_id},
                {"$set": {"images": new_images}}
            )
            updated_count += 1
            print(f"📝 Updated doc {doc_id}")

    print(f"🎉 Update complete! Updated {updated_count} documents.")
    client.close()

if __name__ == "__main__":
    update_file_ids()