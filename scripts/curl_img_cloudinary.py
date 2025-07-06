import os
import shutil
import subprocess
from PIL import Image
from dotenv import load_dotenv
from pymongo import MongoClient
from bson import ObjectId
import cloudinary
import cloudinary.uploader

# Load env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))
MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB")
COLLECTION_NAME = "rice"

# Cloudinary config
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

# Mongo
client = MongoClient(MONGO_URI)
collection = client[DB_NAME][COLLECTION_NAME]

# Target IDs
TARGET_IDS = [
    "68570ebf6d70f4df72f0e7ff"
]

TEMP_DIR = "temp"
os.makedirs(TEMP_DIR, exist_ok=True)

def clear_temp():
    for f in os.listdir(TEMP_DIR):
        os.remove(os.path.join(TEMP_DIR, f))

def download_image_curl(url, filepath):
    try:
        subprocess.run(["curl", "-L", "-o", filepath, url], check=True)
        return os.path.exists(filepath)
    except subprocess.CalledProcessError:
        print(f"❌ Failed to curl: {url}")
        return False

def resize_if_needed(filepath, max_size_mb=10):
    if os.path.getsize(filepath) <= max_size_mb * 1024 * 1024:
        return filepath

    try:
        img = Image.open(filepath)
        img_format = img.format
        resized_path = filepath.replace(".", "_resized.")

        # Reduce size progressively
        quality = 90
        while quality > 10:
            img.save(resized_path, format=img_format, optimize=True, quality=quality)
            if os.path.getsize(resized_path) <= max_size_mb * 1024 * 1024:
                return resized_path
            quality -= 10

        print(f"⚠️ Could not resize under {max_size_mb}MB: {filepath}")
        return None
    except Exception as e:
        print(f"❌ Resize error: {e}")
        return None

def upload_to_cloudinary(filepath, public_id):
    try:
        result = cloudinary.uploader.upload(filepath, public_id=public_id)
        return result["secure_url"]
    except Exception as e:
        print(f"❌ Cloudinary upload failed for {filepath}: {e}")
        return None

updated = 0
skipped = 0

for id_str in TARGET_IDS:
    clear_temp()
    doc = collection.find_one({"_id": ObjectId(id_str)})
    if not doc:
        print(f"❌ Document not found: {id_str}")
        skipped += 1
        continue

    screenshots = doc.get("screenshots", [])
    if not screenshots:
        print(f"⚠️ No screenshots in: {id_str}")
        skipped += 1
        continue

    print(f"📥 Processing {id_str} with {len(screenshots)} screenshots")

    cloud_urls = []
    for idx, url in enumerate(screenshots):
        filename = f"{id_str}_{idx}.png"
        filepath = os.path.join(TEMP_DIR, filename)

        if not download_image_curl(url, filepath):
            continue

        filepath_resized = resize_if_needed(filepath)
        if not filepath_resized:
            continue

        cloud_url = upload_to_cloudinary(filepath_resized, f"rices/{id_str}_{idx}")
        if cloud_url:
            cloud_urls.append(cloud_url)

    if cloud_urls:
        collection.update_one(
            {"_id": ObjectId(id_str)},
            {"$set": {"images": cloud_urls}}
        )
        print(f"✅ Uploaded {len(cloud_urls)} images for {id_str}")
        updated += 1
    else:
        print(f"⚠️ Skipped {id_str} — no valid images")
        skipped += 1

clear_temp()
print(f"\n🎯 Done. ✅ Updated: {updated}, ⏭️ Skipped: {skipped}")
