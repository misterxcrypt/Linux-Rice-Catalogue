#!/usr/bin/env python3
"""
Migrate images from local storage to ImageKit and update MongoDB URLs.
"""

import os
import json
from pathlib import Path
from imagekitio import ImageKit
from pymongo import MongoClient
from dotenv import load_dotenv
from tqdm import tqdm

# Load environment variables
load_dotenv()

# ImageKit configuration
imagekit = ImageKit(
    public_key=os.getenv('IMAGEKIT_PUBLIC_KEY'),
    private_key=os.getenv('IMAGEKIT_PRIVATE_KEY'),
    url_endpoint=os.getenv('IMAGEKIT_URL_ENDPOINT')
)

# MongoDB configuration
mongo_client = MongoClient(os.getenv('MONGODB_URI'))
db = mongo_client[os.getenv('MONGODB_DB')]
rices_collection = db['rice']

def upload_image_to_imagekit(image_path):
    """Upload a single image to ImageKit using direct HTTP API"""
    try:
        import requests
        import base64

        filename = image_path.name

        # Upload to ImageKit using direct HTTP request
        with open(image_path, 'rb') as file_data:
            # Prepare the multipart form data
            files = {'file': (filename, file_data, 'image/png')}
            data = {
                'fileName': filename,
                'folder': '/rices/',
                'useUniqueFileName': 'false',
                'overwriteFile': 'true'
            }

            # Basic auth with private key
            auth_string = f"{os.getenv('IMAGEKIT_PRIVATE_KEY')}:"
            auth_header = base64.b64encode(auth_string.encode()).decode()

            headers = {
                'Authorization': f'Basic {auth_header}'
            }

            response = requests.post(
                'https://upload.imagekit.io/api/v2/files/upload',
                files=files,
                data=data,
                headers=headers
            )

            upload_response = response.json()

        # Check response - ImageKit returns a dict with 'url' field
        if upload_response and 'url' in upload_response:
            return {'url': upload_response['url']}
        else:
            print(f"❌ Upload failed for {filename}: {upload_response}")
            return None

    except Exception as e:
        print(f"❌ Error uploading {image_path}: {str(e)}")
        return None

def update_mongo_urls(uploaded_urls):
    """Update MongoDB documents with ImageKit URLs in imgkit_urls field"""
    print("🔄 Updating MongoDB with ImageKit URLs...")

    updated_count = 0
    for filename, imagekit_url in tqdm(uploaded_urls.items(), desc="Updating MongoDB"):
        try:
            # Find documents where this filename exists in the images array
            result = rices_collection.update_many(
                {"images": filename},  # Find docs where images array contains this filename
                {"$push": {"imgkit_urls": imagekit_url}}  # Add ImageKit URL to imgkit_urls array
            )

            if result.modified_count > 0:
                updated_count += result.modified_count

        except Exception as e:
            print(f"❌ Error updating documents for {filename}: {str(e)}")

    print(f"✅ Updated {updated_count} rice documents with ImageKit URLs")

def main():
    # Directory containing images
    img_dir = Path('../public/img')

    if not img_dir.exists():
        print(f"❌ Directory {img_dir} does not exist!")
        return

    # Get all image files
    image_files = list(img_dir.glob('*'))
    image_files = [f for f in image_files if f.is_file() and f.suffix.lower() in {'.jpg', '.jpeg', '.png', '.gif', '.webp'}]

    if not image_files:
        print(f"❌ No image files found in {img_dir}")
        return

    print(f"📸 Found {len(image_files)} images to upload to ImageKit")

    # Upload images with progress bar
    uploaded_urls = {}
    with tqdm(total=len(image_files), desc="Uploading to ImageKit") as pbar:
        for image_path in image_files:
            result = upload_image_to_imagekit(image_path)
            if result:
                filename = image_path.name
                uploaded_urls[filename] = result['url']
            pbar.update(1)

    print(f"✅ Successfully uploaded {len(uploaded_urls)} images to ImageKit")

    # Skip MongoDB updates - we'll construct URLs from filename template
    # update_mongo_urls(uploaded_urls)

    # Save mapping for reference
    with open('imagekit_mapping.json', 'w') as f:
        json.dump(uploaded_urls, f, indent=2)

    print("✅ Migration complete!")
    print(f"📄 Mapping saved to imagekit_mapping.json")

if __name__ == "__main__":
    main()