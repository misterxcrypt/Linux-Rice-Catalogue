import json
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))
# MongoDB connection
client = MongoClient(os.getenv('MONGODB_URI'))
db = client[os.getenv('MONGODB_DB', 'linux-ricing-db')]
collection = db['rice']  # Assuming the collection name is 'rices'

# First, delete images field in all objects
result = collection.update_many({}, {'$unset': {'images': 1}})
print(f"Deleted images field from {result.modified_count} documents.")

# Load the new_rices_with_images.json
with open('../data/new_rices_with_images.json', 'r') as f:
    new_rices = json.load(f)

# Process each rice
for rice in new_rices:
    source_key = rice['source_key']
    new_images = rice['images']

    # Find the document in MongoDB by source_key
    doc = collection.find_one({'source_key': source_key})
    if doc:
        # Update the images array
        collection.update_one(
            {'source_key': source_key},
            {'$set': {'images': new_images}}
        )
        print(f"Updated images for {source_key}")
    else:
        print(f"No document found for {source_key}")

print("MongoDB update completed.")