import os
import requests
import cloudinary
import cloudinary.uploader
from pymongo import MongoClient
from PIL import Image  # ✅ required for resizing
from io import BytesIO
from bson import ObjectId
from dotenv import load_dotenv

# --- Load environment variables ---
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB")
COLLECTION_NAME = "rice"
MAX_SIZE = 10 * 1024 * 1024

TARGET_IDS = [
    "68570ebf6d70f4df72f0e7ff"
]
# --- Cloudinary config ---
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")  # store secret in .env
)

# --- MongoDB setup ---
client = MongoClient(MONGO_URI)
collection = client[DB_NAME][COLLECTION_NAME]

# --- Function to upload image to Cloudinary ---
# def upload_image_to_cloudinary(image_url, public_id=None):
#     try:
#         res = requests.get(image_url, stream=True)
#         res.raise_for_status()

#         content_length = int(res.headers.get('Content-Length', 0))
#         raw_stream = res.raw

#         if content_length > MAX_SIZE:
#             print(f"⚠️ Image too large ({content_length} bytes). Resizing: {image_url}")
#             img = Image.open(raw_stream)

#             # Resize proportionally (reduce to 80% until under limit)
#             quality = 85
#             for scale in [0.9, 0.8, 0.7, 0.6, 0.5]:
#                 new_width = int(img.width * scale)
#                 new_height = int(img.height * scale)
#                 resized = img.resize((new_width, new_height), Image.LANCZOS)

#                 buffer = BytesIO()
#                 resized.convert("RGB").save(buffer, format='JPEG', quality=quality)
#                 buffer.seek(0)

#                 if buffer.getbuffer().nbytes < MAX_SIZE:
#                     print(f"✅ Resized to {new_width}x{new_height}, uploading...")
#                     return cloudinary.uploader.upload(buffer, public_id=public_id)['secure_url']

#             print(f"❌ Still too big after resizing: {image_url}")
#             return None

#         # Normal upload
#         return cloudinary.uploader.upload(raw_stream, public_id=public_id)['secure_url']

#     except Exception as e:
#         print(f"❌ Failed to upload {image_url}: {e}")
#         return None

def upload_image_to_cloudinary(image_url, public_id=None):
    try:
        # Download the image locally (handles Imgur/hotlink-protected sources)
        response = requests.get(image_url, stream=True, timeout=10)
        response.raise_for_status()

        content_length = int(response.headers.get("Content-Length", 0))
        if content_length > 10 * 1024 * 1024:
            print(f"⚠️ {image_url} too large ({content_length} bytes) — skipping")
            return None

        # Write to a temporary file
        with NamedTemporaryFile(delete=True, suffix=".png") as tmp:
            for chunk in response.iter_content(8192):
                tmp.write(chunk)
            tmp.flush()

            # Upload the file from disk to Cloudinary
            uploaded = cloudinary.uploader.upload(tmp.name, public_id=public_id)
            return uploaded['secure_url']

    except Exception as e:
        print(f"❌ Failed to upload from {image_url}: {e}")
        return None

# --- Process all documents ---
updated_count = 0
skipped = 0

for id_str in TARGET_IDS:
    doc = collection.find_one({ "_id": ObjectId(id_str) })

    original_urls = doc['screenshots']
    new_urls = []

    for idx, url in enumerate(original_urls):
        public_id = f"rices/{doc.get('_id')}_{idx}"
        new_url = upload_image_to_cloudinary(url, public_id=public_id)
        if new_url:
            new_urls.append(new_url)

    if new_urls:
        collection.update_one(
            { "_id": doc["_id"] },
            { "$set": { "images": new_urls } }  # ✅ Add as new 'images' field
        )
        print(f"✅ Updated {doc['_id']} with {len(new_urls)} images")
        updated_count += 1
    else:
        print(f"⚠️ Skipped {doc['_id']} — no valid uploads")
        skipped += 1

print(f"\n✅ Total updated: {updated_count}")
print(f"⏭️ Skipped (empty or failed): {skipped}")
