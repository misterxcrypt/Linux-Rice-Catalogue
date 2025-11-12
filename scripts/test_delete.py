#!/usr/bin/env python3
"""
Test ImageKit delete with specific fileIds using HTTP client.
"""

import os
import http.client
import base64
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_delete(file_id):
    """Test deleting a file by fileId using HTTP client"""
    print(f"🗑️ Testing delete of fileId: {file_id}")

    # Setup connection
    conn = http.client.HTTPSConnection("api.imagekit.io")

    # Create auth header
    private_key = os.getenv('IMAGEKIT_PRIVATE_KEY')
    auth_string = f"{private_key}:"
    auth_header = base64.b64encode(auth_string.encode()).decode()

    headers = {
        'Accept': "application/json",
        'Authorization': f"Basic {auth_header}"
    }

    try:
        # Make request
        conn.request("DELETE", f"/v1/files/{file_id}", headers=headers)

        # Get response
        res = conn.getresponse()
        data = res.read()

        print(f"📊 Status: {res.status}")
        print(f"📋 Response: {data.decode('utf-8')}")

        if res.status == 204:
            print("✅ Delete successful!")
            return True
        else:
            print("❌ Delete failed!")
            return False

    except Exception as e:
        print(f"❌ Request failed: {str(e)}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    # Test the two fileIds
    file_ids = [
        "6914e4355c7cd75eb803cf22"
    ]

    for file_id in file_ids:
        print(f"\n{'='*50}")
        test_delete(file_id)
        print(f"{'='*50}")