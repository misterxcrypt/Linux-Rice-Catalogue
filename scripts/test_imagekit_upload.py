#!/usr/bin/env python3
"""
Test ImageKit upload with a single image to understand the response format.
"""

import os
from pathlib import Path
from imagekitio import ImageKit
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ImageKit configuration
imagekit = ImageKit(
    public_key=os.getenv('IMAGEKIT_PUBLIC_KEY'),
    private_key=os.getenv('IMAGEKIT_PRIVATE_KEY'),
    url_endpoint=os.getenv('IMAGEKIT_URL_ENDPOINT')
)

def test_single_upload():
    """Test uploading a single image and print the response"""
    # Get the first image from public/img
    img_dir = Path('../public/img')
    image_files = list(img_dir.glob('*'))
    image_files = [f for f in image_files if f.is_file() and f.suffix.lower() in {'.jpg', '.jpeg', '.png', '.gif', '.webp'}]

    if not image_files:
        print("❌ No image files found!")
        return

    # Take the first image
    image_path = image_files[0]
    filename = image_path.name

    print(f"📸 Testing upload of: {filename}")
    print(f"📁 Full path: {image_path}")

    try:
        # Upload to ImageKit using direct HTTP request as per their API docs
        import requests
        import base64

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

            upload_response = requests.post(
                'https://upload.imagekit.io/api/v2/files/upload',
                files=files,
                data=data,
                headers=headers
            )

            upload_response = upload_response.json()

        print("✅ Upload successful!")
        print("📋 Response type:", type(upload_response))
        print("📋 Response content:")
        print(upload_response)

        # Try to access different possible response formats
        if hasattr(upload_response, 'url'):
            print(f"🔗 URL: {upload_response.url}")
        elif isinstance(upload_response, dict) and 'url' in upload_response:
            print(f"🔗 URL: {upload_response['url']}")
        elif hasattr(upload_response, 'response_metadata') and hasattr(upload_response.response_metadata, 'raw'):
            print(f"🔗 URL: {upload_response.response_metadata.raw.get('url', 'Not found')}")
        else:
            print("❓ URL not found in response")

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        print(f"   Response: {upload_response if 'upload_response' in locals() else 'No response'}")

if __name__ == "__main__":
    test_single_upload()