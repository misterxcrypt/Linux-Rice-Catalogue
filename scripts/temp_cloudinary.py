import os
import cloudinary
import cloudinary.uploader
from pymongo import MongoClient
from dotenv import load_dotenv
from PIL import Image
from bson import ObjectId

# --- Config ---
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB")
COLLECTION_NAME = "rice"

TEMP_DIR = "temp"

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

client = MongoClient(MONGO_URI)
collection = client[DB_NAME][COLLECTION_NAME]

# --- Resize image if needed ---
def resize_if_needed(filepath, max_size_mb=10):
    if os.path.getsize(filepath) <= max_size_mb * 1024 * 1024:
        return filepath

    try:
        img = Image.open(filepath)
        img_format = img.format
        resized_path = filepath.replace(".", "_resized.")

        quality = 90
        while quality > 10:
            img.save(resized_path, format=img_format, optimize=True, quality=quality)
            if os.path.getsize(resized_path) <= max_size_mb * 1024 * 1024:
                return resized_path
            quality -= 10

        print(f"⚠️ Could not resize under {max_size_mb}MB: {filepath}")
        return None
    except Exception as e:
        print(f"❌ Resize error for {filepath}: {e}")
        return None

# --- Upload and update Mongo ---
def process_file(filepath):
    filename = os.path.basename(filepath)

    # Parse filename
    try:
        base, ext = os.path.splitext(filename)
        mongo_id, index = base.split("_")
    except ValueError:
        print(f"⚠️ Invalid filename format: {filename}")
        return

    resized_path = resize_if_needed(filepath)
    if not resized_path:
        return

    public_id = f"rices/{mongo_id}_{index}"

    try:
        uploaded = cloudinary.uploader.upload(resized_path, public_id=public_id)
        image_url = uploaded["secure_url"]
        print(image_url)
    except Exception as e:
        print(f"❌ Upload failed for {filename}: {e}")
        return

    # Update DB
    result = collection.update_one(
            { "_id": ObjectId(mongo_id) },
            { "$set": { "images": image_url } }  # ✅ Add as new 'images' field
    )

    if result.modified_count:
        print(f"✅ Uploaded and updated MongoDB for {filename}")
    else:
        print(f"⚠️ Upload success, but Mongo update failed for {filename}")

# --- Run ---
for file in os.listdir(TEMP_DIR):
    full_path = os.path.join(TEMP_DIR, file)
    if os.path.isfile(full_path):
        process_file(full_path)
