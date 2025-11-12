#!/usr/bin/env python3
"""
List ImageKit files with search query using the SDK.
"""

import os
from imagekitio import ImageKit
from imagekitio.models.ListAndSearchFileRequestOptions import ListAndSearchFileRequestOptions
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ImageKit configuration
imagekit = ImageKit(
    public_key=os.getenv('IMAGEKIT_PUBLIC_KEY'),
    private_key=os.getenv('IMAGEKIT_PRIVATE_KEY'),
    url_endpoint=os.getenv('IMAGEKIT_URL_ENDPOINT')
)

def list_files_example():
    # Create search options
    options = ListAndSearchFileRequestOptions(
        search_query='name="6d46103c619c4d9eaf348088f0d0c1a3.png"'
    )

    # List files
    list_files = imagekit.list_files(options=options)

    print("List files-", "\n", list_files)

    # Raw Response
    print("\nRaw Response:")
    print(list_files.response_metadata.raw)

    # Print the first file's ID (if exists)
    if list_files.list and len(list_files.list) > 0:
        print(f"\nFirst file's ID: {list_files.list[0].file_id}")
    else:
        print("\nNo files found matching the search query.")

if __name__ == "__main__":
    list_files_example()